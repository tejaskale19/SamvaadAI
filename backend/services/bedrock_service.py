"""
AWS Bedrock Service for SAMVAAD AI
Integrates with AWS Bedrock using Llama 3 for content generation
"""

import asyncio
import json
import boto3
import logging
from typing import List, Dict, Any, Optional
from botocore.exceptions import ClientError
import uuid

from config import get_settings, PLATFORM_CONFIGS
from utils.aws_retry import with_retry

logger = logging.getLogger(__name__)
settings = get_settings()


class BedrockService:
    """Service for AWS Bedrock AI content generation"""
    
    def __init__(self):
        """Initialize Bedrock client"""
        self.client = boto3.client(
            "bedrock-runtime",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        self.model_id = settings.BEDROCK_MODEL_ID
        self.max_tokens = settings.BEDROCK_MAX_TOKENS
        self.temperature = settings.BEDROCK_TEMPERATURE
    
    def _build_system_prompt(self, platform: str, language: str, tone: str) -> str:
        """Build system prompt for content generation"""
        platform_config = PLATFORM_CONFIGS.get(platform, PLATFORM_CONFIGS["instagram"])
        
        return f"""You are SAMVAAD AI, an expert social media content creator specializing in Indian market content.
        
Your task is to generate engaging social media content with these specifications:
- Platform: {platform.upper()}
- Maximum content length: {platform_config['max_length']} characters
- Optimal hashtag count: {platform_config['optimal_hashtags']}
- Emojis supported: {platform_config['supports_emojis']}
- Links supported: {platform_config['supports_links']}
- Tone: {tone}
- Primary language: {language}

Guidelines:
1. Create culturally relevant content for Indian audience
2. Include regional festivals, traditions, and local context when appropriate
3. Use appropriate emojis that resonate with Indian users
4. Generate hashtags that are trending in India
5. Maintain brand voice consistency
6. Ensure content is platform-optimized
7. Include call-to-action when appropriate

For Amazon product content:
- Focus on product benefits and features
- Include bullet points for easy reading
- Highlight unique selling points
- Use persuasive but honest language

Output your response in valid JSON format only."""
    
    def _build_content_prompt(
        self,
        user_prompt: str,
        platform: str,
        cultural_context: Optional[str],
        target_audience: Optional[str],
        include_hashtags: bool,
        include_emojis: bool,
        num_variants: int
    ) -> str:
        """Build the content generation prompt"""
        context_info = ""
        if cultural_context:
            context_info = f"\nCultural Context: {cultural_context} (incorporate relevant themes, greetings, and traditions)"
        
        audience_info = ""
        if target_audience:
            audience_info = f"\nTarget Audience: {target_audience}"
        
        hashtag_instruction = "Include relevant hashtags" if include_hashtags else "Do not include hashtags"
        emoji_instruction = "Include appropriate emojis" if include_emojis else "Do not include emojis"
        
        return f"""Generate {num_variants} unique content variants for the following request:

User Request: {user_prompt}
{context_info}
{audience_info}

Requirements:
- {hashtag_instruction}
- {emoji_instruction}
- Each variant should have a different approach/angle
- Variants should be creative and engaging

Respond in this exact JSON format:
{{
    "variants": [
        {{
            "variant_id": "var_001",
            "content": "Your generated content here",
            "hashtags": ["#Hashtag1", "#Hashtag2"],
            "emojis": ["emoji1", "emoji2"],
            "approach": "Brief description of the content approach"
        }}
    ]
}}

Generate exactly {num_variants} variants."""

    @with_retry(max_attempts=3, base_delay=1.0)
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
        """
        Generate content using AWS Bedrock with Llama 3
        
        Args:
            prompt: User's content request
            platform: Target social media platform
            language: Content language
            tone: Content tone (professional, casual, festive, etc.)
            cultural_context: Cultural/festival context
            target_audience: Target audience description
            include_hashtags: Whether to include hashtags
            include_emojis: Whether to include emojis
            num_variants: Number of content variants to generate
            
        Returns:
            Dictionary with generated content variants
        """
        try:
            system_prompt = self._build_system_prompt(platform, language, tone)
            content_prompt = self._build_content_prompt(
                prompt, platform, cultural_context, target_audience,
                include_hashtags, include_emojis, num_variants
            )
            
            # Prepare request body for Llama 3
            request_body = {
                "prompt": f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{system_prompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{content_prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n",
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
            generated_text = response_body.get("generation", "")
            
            # Parse the JSON response
            try:
                # Find JSON in the response
                json_start = generated_text.find("{")
                json_end = generated_text.rfind("}") + 1
                if json_start != -1 and json_end > json_start:
                    json_str = generated_text[json_start:json_end]
                    result = json.loads(json_str)
                else:
                    raise ValueError("No JSON found in response")
            except json.JSONDecodeError:
                logger.warning("Failed to parse JSON, creating structured response")
                result = self._create_fallback_response(generated_text, num_variants)
            
            # Add unique IDs if not present
            for i, variant in enumerate(result.get("variants", [])):
                if "variant_id" not in variant:
                    variant["variant_id"] = f"var_{uuid.uuid4().hex[:8]}"
                variant["engagement_score"] = None
                variant["is_selected"] = False
            
            return {
                "success": True,
                "content_id": f"content_{uuid.uuid4().hex[:12]}",
                "platform": platform,
                "variants": result.get("variants", []),
                "metadata": {
                    "model": self.model_id,
                    "prompt": prompt,
                    "cultural_context": cultural_context,
                    "target_audience": target_audience,
                }
            }
            
        except ClientError as e:
            logger.error(f"Bedrock API error: {e}")
            return {
                "success": False,
                "error": str(e),
                "variants": self._generate_demo_variants(prompt, platform, num_variants)
            }
        except Exception as e:
            logger.error(f"Content generation error: {e}")
            return {
                "success": False,
                "error": str(e),
                "variants": self._generate_demo_variants(prompt, platform, num_variants)
            }
    
    def _create_fallback_response(self, text: str, num_variants: int) -> Dict[str, Any]:
        """Create a structured response from unstructured text"""
        variants = []
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        
        for i in range(min(num_variants, max(1, len(paragraphs)))):
            content = paragraphs[i] if i < len(paragraphs) else paragraphs[0]
            variants.append({
                "variant_id": f"var_{uuid.uuid4().hex[:8]}",
                "content": content,
                "hashtags": self._extract_hashtags(content),
                "emojis": self._extract_emojis(content),
                "approach": "Generated content"
            })
        
        return {"variants": variants}
    
    def _extract_hashtags(self, text: str) -> List[str]:
        """Extract hashtags from text"""
        import re
        return re.findall(r'#\w+', text)
    
    def _extract_emojis(self, text: str) -> List[str]:
        """Extract emojis from text"""
        import re
        emoji_pattern = re.compile(
            "["
            "\U0001F600-\U0001F64F"
            "\U0001F300-\U0001F5FF"
            "\U0001F680-\U0001F6FF"
            "\U0001F1E0-\U0001F1FF"
            "\U00002702-\U000027B0"
            "\U000024C2-\U0001F251"
            "]+",
            flags=re.UNICODE
        )
        return emoji_pattern.findall(text)
    
    def _generate_demo_variants(self, prompt: str, platform: str, num_variants: int) -> List[Dict]:
        """Generate demo variants when Bedrock is unavailable"""
        demo_contents = [
            {
                "variant_id": f"var_{uuid.uuid4().hex[:8]}",
                "content": f"✨ {prompt[:100]}... Discover the magic of Indian craftsmanship! Our collection celebrates tradition with a modern twist. #MadeInIndia #Handcrafted 🪔",
                "hashtags": ["#MadeInIndia", "#Handcrafted", "#IndianCrafts", "#ShopLocal"],
                "emojis": ["✨", "🪔", "🎨"],
                "approach": "Traditional appeal with modern touch",
                "engagement_score": None,
                "is_selected": False
            },
            {
                "variant_id": f"var_{uuid.uuid4().hex[:8]}",
                "content": f"🎉 Exciting news! {prompt[:80]}... Join thousands of happy customers who've embraced authentic Indian artistry. Limited stock! 🛍️ #SupportArtisans",
                "hashtags": ["#SupportArtisans", "#AuthenticIndian", "#LimitedEdition", "#ShopNow"],
                "emojis": ["🎉", "🛍️", "💫"],
                "approach": "Urgency and social proof",
                "engagement_score": None,
                "is_selected": False
            },
            {
                "variant_id": f"var_{uuid.uuid4().hex[:8]}",
                "content": f"🌟 {prompt[:90]}... Each piece tells a story of Indian heritage and skilled craftsmanship. Perfect for those who appreciate the extraordinary! 💝 #PremiumQuality",
                "hashtags": ["#PremiumQuality", "#IndianHeritage", "#ArtisanMade", "#Exclusive"],
                "emojis": ["🌟", "💝", "✨"],
                "approach": "Premium positioning",
                "engagement_score": None,
                "is_selected": False
            }
        ]
        
        return demo_contents[:num_variants]


# Create singleton instance
bedrock_service = BedrockService()
