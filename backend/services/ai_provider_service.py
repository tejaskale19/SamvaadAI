"""
AI Provider Service for SAMVAAD AI
Switchable provider layer supporting both AWS Bedrock and OpenAI
"""

import asyncio
import json
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from enum import Enum
import uuid

from config import get_settings, PLATFORM_CONFIGS

logger = logging.getLogger(__name__)
settings = get_settings()


class AIProvider(str, Enum):
    """Available AI providers"""
    BEDROCK = "bedrock"
    OPENAI = "openai"
    AUTO = "auto"  # Auto-select based on availability


class BaseAIProvider(ABC):
    """Abstract base class for AI providers"""
    
    @abstractmethod
    async def generate_content(
        self,
        prompt: str,
        platform: str,
        language: str,
        tone: str,
        cultural_context: Optional[str],
        target_audience: Optional[str],
        include_hashtags: bool,
        include_emojis: bool,
        num_variants: int
    ) -> Dict[str, Any]:
        """Generate content using the AI provider"""
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if the provider is available"""
        pass
    
    @abstractmethod
    def get_provider_name(self) -> str:
        """Get the provider name"""
        pass


class BedrockProvider(BaseAIProvider):
    """AWS Bedrock AI Provider using Llama 3"""
    
    def __init__(self):
        """Initialize Bedrock provider"""
        import boto3
        from botocore.exceptions import ClientError, NoCredentialsError
        
        self._available = False
        
        try:
            self.client = boto3.client(
                "bedrock-runtime",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
            )
            self.model_id = settings.BEDROCK_MODEL_ID
            self.max_tokens = settings.BEDROCK_MAX_TOKENS
            self.temperature = settings.BEDROCK_TEMPERATURE
            
            # Verify credentials are resolvable (explicit settings OR default chain)
            creds = self.client._request_signer._credentials
            if creds is None or creds.access_key is None:
                raise NoCredentialsError()
            
            self._available = True
            logger.info(f"Bedrock provider initialized with model: {self.model_id}")
        except NoCredentialsError:
            logger.warning("Bedrock provider: no AWS credentials found (set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY or configure ~/.aws/credentials)")
        except Exception as e:
            logger.warning(f"Bedrock provider initialization failed: {e}")
    
    def is_available(self) -> bool:
        return self._available
    
    def get_provider_name(self) -> str:
        return "bedrock"
    
    def _build_prompt(
        self,
        user_prompt: str,
        platform: str,
        language: str,
        tone: str,
        cultural_context: Optional[str],
        target_audience: Optional[str],
        include_hashtags: bool,
        include_emojis: bool,
        num_variants: int
    ) -> str:
        """Build the complete prompt for Bedrock"""
        platform_config = PLATFORM_CONFIGS.get(platform, PLATFORM_CONFIGS["instagram"])
        
        system_context = f"""You are SAMVAAD AI, an expert social media content creator specializing in Indian market content.

Platform: {platform.upper()}
Maximum length: {platform_config['max_length']} characters
Optimal hashtags: {platform_config['optimal_hashtags']}
Tone: {tone}
Language: {language}

Guidelines:
1. Create culturally relevant content for Indian audience
2. Include regional festivals, traditions, and local context when appropriate
3. Use appropriate emojis that resonate with Indian users
4. Generate hashtags that are trending in India
5. Maintain brand voice consistency
"""
        
        hashtag_instruction = "Include relevant hashtags" if include_hashtags else "Do not include hashtags"
        emoji_instruction = "Include appropriate emojis" if include_emojis else "Do not include emojis"
        
        context_info = ""
        if cultural_context:
            context_info = f"\nCultural Context: {cultural_context}"
        
        audience_info = ""
        if target_audience:
            audience_info = f"\nTarget Audience: {target_audience}"
        
        user_message = f"""Generate {num_variants} unique content variants for this request:

User Request: {user_prompt}
{context_info}
{audience_info}

Requirements:
- {hashtag_instruction}
- {emoji_instruction}
- Each variant should have a different approach/angle

Respond in JSON format:
{{
    "variants": [
        {{
            "variant_id": "var_001",
            "content": "Your generated content",
            "hashtags": ["#Hashtag1", "#Hashtag2"],
            "tone": "professional|casual|festive",
            "approach": "Brief description"
        }}
    ]
}}"""
        
        # Format as Llama 3 Instruct chat template
        return (
            "<|begin_of_text|>"
            "<|start_header_id|>system<|end_header_id|>\n\n"
            f"{system_context}<|eot_id|>"
            "<|start_header_id|>user<|end_header_id|>\n\n"
            f"{user_message}<|eot_id|>"
            "<|start_header_id|>assistant<|end_header_id|>\n\n"
        )
    
    async def generate_content(
        self,
        prompt: str,
        platform: str = "instagram",
        language: str = "en",
        tone: str = "professional",
        cultural_context: Optional[str] = None,
        target_audience: Optional[str] = None,
        include_hashtags: bool = True,
        include_emojis: bool = True,
        num_variants: int = 3
    ) -> Dict[str, Any]:
        """Generate content using AWS Bedrock"""
        from botocore.exceptions import ClientError
        
        if not self.is_available():
            logger.warning("Bedrock provider not available — skipping")
            return {"success": False, "error": "Bedrock provider not available"}
        
        try:
            logger.info("Using Bedrock provider for content generation")
            full_prompt = self._build_prompt(
                prompt, platform, language, tone,
                cultural_context, target_audience,
                include_hashtags, include_emojis, num_variants
            )
            
            # Prepare request body for Llama 3
            request_body = {
                "prompt": full_prompt,
                "max_gen_len": self.max_tokens,
                "temperature": self.temperature,
                "top_p": 0.9,
            }
            
            logger.info(f"Sending request to Bedrock model: {self.model_id}")
            _body = json.dumps(request_body)
            response = await asyncio.to_thread(
                lambda: self.client.invoke_model(
                    modelId=self.model_id,
                    body=_body,
                    contentType="application/json",
                    accept="application/json",
                )
            )
            
            response_body = json.loads(response["body"].read())
            response_text = response_body.get("generation", "")
            logger.info("Bedrock invocation successful")
            
            # Parse JSON from response
            json_match = None
            if "{" in response_text and "}" in response_text:
                start = response_text.find("{")
                end = response_text.rfind("}") + 1
                try:
                    json_match = json.loads(response_text[start:end])
                except json.JSONDecodeError:
                    pass
            
            if json_match and "variants" in json_match:
                variants = json_match["variants"]
            else:
                # Fallback: create single variant from response
                variants = [{
                    "variant_id": f"var_{uuid.uuid4().hex[:8]}",
                    "content": response_text.strip(),
                    "hashtags": [],
                    "tone": tone,
                    "approach": "AI generated"
                }]
            
            # Ensure variant IDs
            for i, v in enumerate(variants):
                if "variant_id" not in v:
                    v["variant_id"] = f"var_{uuid.uuid4().hex[:8]}"
            
            return {
                "success": True,
                "content_id": f"content_{uuid.uuid4().hex[:12]}",
                "variants": variants[:num_variants],
                "provider": "bedrock",
                "model": self.model_id,
            }
            
        except ClientError as e:
            logger.error(f"Bedrock generation error: {e}")
            return {"success": False, "error": str(e), "provider": "bedrock"}
        except Exception as e:
            logger.error(f"Bedrock unexpected error: {e}")
            return {"success": False, "error": str(e), "provider": "bedrock"}


class OpenAIProvider(BaseAIProvider):
    """OpenAI AI Provider using GPT models"""
    
    def __init__(self):
        """Initialize OpenAI provider"""
        self._available = False
        self.client = None
        
        openai_key = getattr(settings, 'OPENAI_API_KEY', None)
        
        if openai_key:
            try:
                from openai import OpenAI
                self.client = OpenAI(api_key=openai_key)
                self.model = getattr(settings, 'OPENAI_MODEL', 'gpt-3.5-turbo')
                self._available = True
                logger.info(f"OpenAI provider initialized with model: {self.model}")
            except ImportError:
                logger.warning("OpenAI package not installed")
            except Exception as e:
                logger.warning(f"OpenAI provider initialization failed: {e}")
        else:
            logger.info("OpenAI API key not configured")
    
    def is_available(self) -> bool:
        return self._available and self.client is not None
    
    def get_provider_name(self) -> str:
        return "openai"
    
    async def generate_content(
        self,
        prompt: str,
        platform: str = "instagram",
        language: str = "en",
        tone: str = "professional",
        cultural_context: Optional[str] = None,
        target_audience: Optional[str] = None,
        include_hashtags: bool = True,
        include_emojis: bool = True,
        num_variants: int = 3
    ) -> Dict[str, Any]:
        """Generate content using OpenAI"""
        if not self.is_available():
            return {"success": False, "error": "OpenAI provider not available"}
        
        try:
            platform_config = PLATFORM_CONFIGS.get(platform, PLATFORM_CONFIGS["instagram"])
            
            system_prompt = f"""You are SAMVAAD AI, an expert social media content creator specializing in Indian market content.

Platform: {platform.upper()}
Maximum content length: {platform_config['max_length']} characters
Optimal hashtag count: {platform_config['optimal_hashtags']}
Tone: {tone}
Language: {language}

Guidelines:
1. Create culturally relevant content for Indian audience
2. Include regional festivals, traditions, and local context when appropriate
3. Use appropriate emojis that resonate with Indian users
4. Generate hashtags that are trending in India
5. Maintain brand voice consistency

Output your response in valid JSON format only."""

            hashtag_instruction = "Include relevant hashtags" if include_hashtags else "Do not include hashtags"
            emoji_instruction = "Include appropriate emojis" if include_emojis else "Do not include emojis"
            
            context_info = f"\nCultural Context: {cultural_context}" if cultural_context else ""
            audience_info = f"\nTarget Audience: {target_audience}" if target_audience else ""
            
            user_prompt = f"""Generate {num_variants} unique content variants for this request:

User Request: {prompt}
{context_info}
{audience_info}

Requirements:
- {hashtag_instruction}
- {emoji_instruction}
- Each variant should have a different approach/angle

Respond in this exact JSON format:
{{
    "variants": [
        {{
            "variant_id": "var_001",
            "content": "Your generated content here",
            "hashtags": ["#Hashtag1", "#Hashtag2"],
            "tone": "professional",
            "approach": "Brief description of the content approach"
        }}
    ]
}}"""
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.8,
                max_tokens=2000,
            )
            
            response_content = response.choices[0].message.content or ""
            
            # Parse JSON from response
            json_match = None
            if "{" in response_content and "}" in response_content:
                start = response_content.find("{")
                end = response_content.rfind("}") + 1
                try:
                    json_match = json.loads(response_content[start:end])
                except json.JSONDecodeError:
                    pass
            
            if json_match and "variants" in json_match:
                variants = json_match["variants"]
            else:
                variants = [{
                    "variant_id": f"var_{uuid.uuid4().hex[:8]}",
                    "content": response_content.strip(),
                    "hashtags": [],
                    "tone": tone,
                    "approach": "AI generated"
                }]
            
            for i, v in enumerate(variants):
                if "variant_id" not in v:
                    v["variant_id"] = f"var_{uuid.uuid4().hex[:8]}"
            
            return {
                "success": True,
                "content_id": f"content_{uuid.uuid4().hex[:12]}",
                "variants": variants[:num_variants],
                "provider": "openai",
                "model": self.model,
            }
            
        except Exception as e:
            logger.error(f"OpenAI generation error: {e}")
            return {"success": False, "error": str(e), "provider": "openai"}


class TemplateProvider(BaseAIProvider):
    """Fallback template-based content provider"""
    
    def __init__(self):
        self._available = True
    
    def is_available(self) -> bool:
        return True
    
    def get_provider_name(self) -> str:
        return "template"
    
    async def generate_content(
        self,
        prompt: str,
        platform: str = "instagram",
        language: str = "en",
        tone: str = "professional",
        cultural_context: Optional[str] = None,
        target_audience: Optional[str] = None,
        include_hashtags: bool = True,
        include_emojis: bool = True,
        num_variants: int = 3
    ) -> Dict[str, Any]:
        """Generate content using templates"""
        logger.warning("Falling back to TEMPLATE provider — output will NOT be prompt-specific")
        
        templates = {
            "professional": f"""🌿 Introducing our sustainable collection inspired by Indian heritage.

{prompt}

Our collection features handcrafted artisanal work with eco-friendly practices. Each piece tells a story of tradition meeting modern consciousness.

Shop consciously. Wear proudly. 🇮🇳

#MadeInIndia #Sustainable #IndianHeritage #Artisan #EcoFriendly""",

            "casual": f"""Hey fashion fam! 👋

Ready to upgrade your wardrobe the sustainable way? 🌱

{prompt}

We're all about that handcrafted vibe with zero guilt! Our clothes are made with love, tradition, and respect for Mother Earth. 🌍

Who's in? Drop a 💚 if you're ready to shop!

#VocalForLocal #SustainableFashion #IndianFashion""",

            "festive": f"""✨ Celebrate in style this season! ✨

{prompt}

Embrace the festivities with our exclusive collection that honors our rich traditions while being kind to the planet. 🪔

Perfect for:
🎉 Family gatherings
🙏 Puja celebrations
💃 Festival parties

#FestivalCollection #IndianFestivals #TraditionalWear #CelebrationMode"""
        }
        
        variants = []
        tones = ["professional", "casual", "festive"]
        
        for i in range(min(num_variants, 3)):
            selected_tone = tones[i % 3]
            content = templates.get(selected_tone, templates["professional"])
            
            if not include_hashtags:
                # Remove hashtags
                lines = content.split('\n')
                content = '\n'.join(line for line in lines if not line.strip().startswith('#'))
            
            if not include_emojis:
                # Simple emoji removal
                import re
                emoji_pattern = re.compile("["
                    "\U0001F600-\U0001F64F"
                    "\U0001F300-\U0001F5FF"
                    "\U0001F680-\U0001F6FF"
                    "\U0001F1E0-\U0001F1FF"
                    "]+", flags=re.UNICODE)
                content = emoji_pattern.sub('', content)
            
            variants.append({
                "variant_id": f"var_{uuid.uuid4().hex[:8]}",
                "content": content.strip(),
                "hashtags": ["#MadeInIndia", "#Sustainable", "#IndianHeritage"] if include_hashtags else [],
                "tone": selected_tone,
                "approach": f"Template-based {selected_tone} content"
            })
        
        return {
            "success": True,
            "content_id": f"content_{uuid.uuid4().hex[:12]}",
            "variants": variants,
            "provider": "template",
            "model": "template-v1",
        }


class AIProviderService:
    """
    Unified AI Provider Service with automatic provider selection
    
    Priority order:
    1. AWS Bedrock (primary - uses Llama 3)
    2. OpenAI (fallback if Bedrock unavailable)
    3. Template (ultimate fallback)
    """
    
    def __init__(self):
        """Initialize all providers"""
        self.bedrock = BedrockProvider()
        self.openai = OpenAIProvider()
        self.template = TemplateProvider()
        
        # Determine primary provider
        self._primary_provider = self._determine_primary_provider()
        logger.info(f"AI Provider initialized. Primary: {self._primary_provider.get_provider_name()}")
    
    def _determine_primary_provider(self) -> BaseAIProvider:
        """Determine the best available provider"""
        # Check preferred provider from settings
        preferred = getattr(settings, 'AI_PROVIDER', 'auto').lower()
        
        if preferred == 'bedrock' and self.bedrock.is_available():
            return self.bedrock
        elif preferred == 'openai' and self.openai.is_available():
            return self.openai
        elif preferred == 'template':
            return self.template
        
        # Auto selection
        if self.bedrock.is_available():
            return self.bedrock
        elif self.openai.is_available():
            return self.openai
        else:
            return self.template
    
    def get_available_providers(self) -> List[str]:
        """Get list of available providers"""
        available = []
        if self.bedrock.is_available():
            available.append("bedrock")
        if self.openai.is_available():
            available.append("openai")
        available.append("template")  # Always available
        return available
    
    def get_current_provider(self) -> str:
        """Get current primary provider name"""
        return self._primary_provider.get_provider_name()
    
    def set_provider(self, provider: str) -> bool:
        """
        Set the preferred provider
        
        Args:
            provider: "bedrock", "openai", "template", or "auto"
            
        Returns:
            True if provider was set successfully
        """
        if provider == "bedrock" and self.bedrock.is_available():
            self._primary_provider = self.bedrock
            return True
        elif provider == "openai" and self.openai.is_available():
            self._primary_provider = self.openai
            return True
        elif provider == "template":
            self._primary_provider = self.template
            return True
        elif provider == "auto":
            self._primary_provider = self._determine_primary_provider()
            return True
        
        return False
    
    async def generate_content(
        self,
        prompt: str,
        platform: str = "instagram",
        language: str = "en",
        tone: str = "professional",
        cultural_context: Optional[str] = None,
        target_audience: Optional[str] = None,
        include_hashtags: bool = True,
        include_emojis: bool = True,
        num_variants: int = 3,
        force_provider: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate content using the best available provider
        
        Args:
            prompt: User's content request
            platform: Target platform
            language: Content language
            tone: Content tone
            cultural_context: Cultural/festival context
            target_audience: Target audience description
            include_hashtags: Include hashtags
            include_emojis: Include emojis
            num_variants: Number of variants
            force_provider: Force specific provider (optional)
            
        Returns:
            Generated content with provider info
        """
        # Select provider
        if force_provider:
            if force_provider == "bedrock" and self.bedrock.is_available():
                provider = self.bedrock
            elif force_provider == "openai" and self.openai.is_available():
                provider = self.openai
            else:
                provider = self.template
        else:
            provider = self._primary_provider
        
        # Try primary provider
        result = await provider.generate_content(
            prompt=prompt,
            platform=platform,
            language=language,
            tone=tone,
            cultural_context=cultural_context,
            target_audience=target_audience,
            include_hashtags=include_hashtags,
            include_emojis=include_emojis,
            num_variants=num_variants
        )
        
        # If failed, try fallback providers
        if not result.get("success") and provider != self.template:
            logger.warning(
                f"Primary provider '{provider.get_provider_name()}' failed: "
                f"{result.get('error', 'unknown error')}. Trying fallback providers."
            )
            
            # Try other providers
            fallback_providers = []
            if provider != self.openai and self.openai.is_available():
                fallback_providers.append(self.openai)
            fallback_providers.append(self.template)
            
            for fallback in fallback_providers:
                logger.info(f"Falling back to {fallback.get_provider_name()} provider")
                result = await fallback.generate_content(
                    prompt=prompt,
                    platform=platform,
                    language=language,
                    tone=tone,
                    cultural_context=cultural_context,
                    target_audience=target_audience,
                    include_hashtags=include_hashtags,
                    include_emojis=include_emojis,
                    num_variants=num_variants
                )
                
                if result.get("success"):
                    logger.info(f"Fallback to {fallback.get_provider_name()} succeeded")
                    break
        
        return result


# Global service instance
ai_provider_service = AIProviderService()
