"""
Trend Service for SAMVAAD AI
Analyzes social media trends and provides recommendations
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import random

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class TrendService:
    """Service for analyzing and providing social media trends"""
    
    def __init__(self):
        """Initialize trend service"""
        # Indian trending topics by category (demo data)
        self.trending_topics = {
            "general": [
                {"topic": "Budget 2026", "volume": 125000, "sentiment": 0.6},
                {"topic": "IPL", "volume": 450000, "sentiment": 0.85},
                {"topic": "Startup India", "volume": 89000, "sentiment": 0.75},
                {"topic": "Digital India", "volume": 67000, "sentiment": 0.7},
                {"topic": "Make in India", "volume": 95000, "sentiment": 0.8},
            ],
            "festivals": [
                {"topic": "Holi 2026", "volume": 320000, "sentiment": 0.95},
                {"topic": "Gudi Padwa", "volume": 45000, "sentiment": 0.9},
                {"topic": "Ugadi", "volume": 38000, "sentiment": 0.88},
                {"topic": "Navratri", "volume": 180000, "sentiment": 0.92},
                {"topic": "Dussehra", "volume": 210000, "sentiment": 0.9},
            ],
            "business": [
                {"topic": "D2C Brands", "volume": 42000, "sentiment": 0.72},
                {"topic": "E-commerce Growth", "volume": 58000, "sentiment": 0.68},
                {"topic": "SME Digital", "volume": 35000, "sentiment": 0.7},
                {"topic": "Export Opportunities", "volume": 28000, "sentiment": 0.65},
                {"topic": "Sustainable Business", "volume": 52000, "sentiment": 0.8},
            ],
            "lifestyle": [
                {"topic": "Sustainable Living", "volume": 78000, "sentiment": 0.82},
                {"topic": "Wellness", "volume": 95000, "sentiment": 0.78},
                {"topic": "Home Decor", "volume": 62000, "sentiment": 0.75},
                {"topic": "Travel India", "volume": 145000, "sentiment": 0.85},
                {"topic": "Food Culture", "volume": 180000, "sentiment": 0.88},
            ],
        }
        
        # Trending hashtags by platform
        self.trending_hashtags = {
            "instagram": [
                {"hashtag": "#ReelsIndia", "posts": 2500000, "growth": 15.2},
                {"hashtag": "#IndianCreator", "posts": 1800000, "growth": 12.5},
                {"hashtag": "#ShopLocal", "posts": 980000, "growth": 22.3},
                {"hashtag": "#MadeInIndia", "posts": 3200000, "growth": 8.7},
                {"hashtag": "#IndianArtist", "posts": 750000, "growth": 18.9},
                {"hashtag": "#Handcrafted", "posts": 1200000, "growth": 14.2},
                {"hashtag": "#EthnicWear", "posts": 890000, "growth": 10.5},
                {"hashtag": "#IndianFood", "posts": 4500000, "growth": 6.8},
            ],
            "twitter": [
                {"hashtag": "#IndiaRising", "tweets": 45000, "growth": 25.3},
                {"hashtag": "#StartupIndia", "tweets": 38000, "growth": 18.7},
                {"hashtag": "#TechTwitter", "tweets": 89000, "growth": 12.4},
                {"hashtag": "#Budget2026", "tweets": 120000, "growth": 45.2},
                {"hashtag": "#IndianPolitics", "tweets": 250000, "growth": 8.9},
            ],
            "linkedin": [
                {"hashtag": "#IndianLeaders", "posts": 18000, "growth": 15.8},
                {"hashtag": "#EntrepreneurIndia", "posts": 25000, "growth": 22.1},
                {"hashtag": "#FutureOfWork", "posts": 45000, "growth": 18.5},
                {"hashtag": "#WomenInBusiness", "posts": 32000, "growth": 28.4},
                {"hashtag": "#DigitalTransformation", "posts": 52000, "growth": 14.2},
            ],
            "facebook": [
                {"hashtag": "#IndianCulture", "posts": 150000, "growth": 8.5},
                {"hashtag": "#FamilyTime", "posts": 280000, "growth": 5.2},
                {"hashtag": "#LocalBusiness", "posts": 95000, "growth": 15.8},
                {"hashtag": "#IndianRecipes", "posts": 320000, "growth": 7.8},
            ],
        }
        
        # Upcoming events and occasions
        self.upcoming_events = self._generate_upcoming_events()
    
    def _generate_upcoming_events(self) -> List[Dict[str, Any]]:
        """Generate list of upcoming Indian events and occasions"""
        now = datetime.now()
        
        # Define events with their approximate dates
        events = [
            {"name": "Republic Day", "month": 1, "day": 26, "type": "national"},
            {"name": "Valentine's Day", "month": 2, "day": 14, "type": "lifestyle"},
            {"name": "Holi", "month": 3, "day": 14, "type": "festival"},
            {"name": "Gudi Padwa", "month": 3, "day": 29, "type": "festival"},
            {"name": "Ugadi", "month": 3, "day": 29, "type": "festival"},
            {"name": "Ram Navami", "month": 4, "day": 6, "type": "festival"},
            {"name": "Baisakhi", "month": 4, "day": 14, "type": "festival"},
            {"name": "Mother's Day", "month": 5, "day": 12, "type": "lifestyle"},
            {"name": "Eid ul-Fitr", "month": 5, "day": 1, "type": "festival"},
            {"name": "Father's Day", "month": 6, "day": 16, "type": "lifestyle"},
            {"name": "Independence Day", "month": 8, "day": 15, "type": "national"},
            {"name": "Raksha Bandhan", "month": 8, "day": 19, "type": "festival"},
            {"name": "Janmashtami", "month": 8, "day": 26, "type": "festival"},
            {"name": "Ganesh Chaturthi", "month": 9, "day": 7, "type": "festival"},
            {"name": "Navratri", "month": 10, "day": 3, "type": "festival"},
            {"name": "Dussehra", "month": 10, "day": 12, "type": "festival"},
            {"name": "Karwa Chauth", "month": 10, "day": 20, "type": "festival"},
            {"name": "Diwali", "month": 11, "day": 1, "type": "festival"},
            {"name": "Children's Day", "month": 11, "day": 14, "type": "national"},
            {"name": "Christmas", "month": 12, "day": 25, "type": "festival"},
            {"name": "New Year", "month": 12, "day": 31, "type": "lifestyle"},
        ]
        
        upcoming = []
        for event in events:
            event_date = datetime(now.year, event["month"], event["day"])
            if event_date < now:
                event_date = datetime(now.year + 1, event["month"], event["day"])
            
            days_until = (event_date - now).days
            if days_until <= 90:  # Only show events within 90 days
                upcoming.append({
                    "name": event["name"],
                    "date": event_date.strftime("%Y-%m-%d"),
                    "days_until": days_until,
                    "type": event["type"],
                    "suggested_prep_days": max(7, days_until - 7),
                })
        
        return sorted(upcoming, key=lambda x: x["days_until"])
    
    async def get_trending_topics(
        self,
        category: Optional[str] = None,
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Get trending topics
        
        Args:
            category: Filter by category (general, festivals, business, lifestyle)
            limit: Maximum number of topics to return
            
        Returns:
            Dictionary with trending topics and metadata
        """
        if category and category in self.trending_topics:
            topics = self.trending_topics[category][:limit]
        else:
            # Combine all categories
            all_topics = []
            for cat_topics in self.trending_topics.values():
                all_topics.extend(cat_topics)
            # Sort by volume
            topics = sorted(all_topics, key=lambda x: x["volume"], reverse=True)[:limit]
        
        # Add trend direction (random for demo)
        for topic in topics:
            topic["trend"] = random.choice(["rising", "stable", "declining"])
            topic["trend_percentage"] = random.uniform(-5, 25)
        
        return {
            "topics": topics,
            "updated_at": datetime.now().isoformat(),
            "category": category or "all",
        }
    
    async def get_trending_hashtags(
        self,
        platform: str = "instagram",
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Get trending hashtags for a platform
        
        Args:
            platform: Social media platform
            limit: Maximum number of hashtags to return
            
        Returns:
            Dictionary with trending hashtags and metadata
        """
        hashtags = self.trending_hashtags.get(
            platform, 
            self.trending_hashtags["instagram"]
        )[:limit]
        
        return {
            "platform": platform,
            "hashtags": hashtags,
            "updated_at": datetime.now().isoformat(),
            "recommendation": f"Top {len(hashtags)} trending hashtags for {platform} in India",
        }
    
    async def get_upcoming_events(
        self,
        event_type: Optional[str] = None,
        days_ahead: int = 30
    ) -> Dict[str, Any]:
        """
        Get upcoming events and occasions
        
        Args:
            event_type: Filter by type (festival, national, lifestyle)
            days_ahead: How many days ahead to look
            
        Returns:
            Dictionary with upcoming events
        """
        events = [e for e in self.upcoming_events if e["days_until"] <= days_ahead]
        
        if event_type:
            events = [e for e in events if e["type"] == event_type]
        
        return {
            "events": events,
            "total": len(events),
            "days_ahead": days_ahead,
            "content_suggestions": self._get_content_suggestions(events),
        }
    
    def _get_content_suggestions(self, events: List[Dict]) -> List[Dict[str, Any]]:
        """Generate content suggestions based on upcoming events"""
        suggestions = []
        
        for event in events[:3]:  # Top 3 events
            suggestions.append({
                "event": event["name"],
                "days_until": event["days_until"],
                "suggestion": f"Create {event['name']} themed content",
                "content_types": ["promotional", "greeting", "storytelling"],
                "start_planning": event["days_until"] > 7,
            })
        
        return suggestions
    
    async def get_content_recommendations(
        self,
        platform: str,
        industry: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get content recommendations based on trends
        
        Args:
            platform: Target platform
            industry: Business industry
            
        Returns:
            Content recommendations
        """
        # Get platform hashtags
        hashtags = await self.get_trending_hashtags(platform, 5)
        
        # Get upcoming events
        events = await self.get_upcoming_events(days_ahead=14)
        
        # Generate recommendations
        recommendations = {
            "platform": platform,
            "trending_hashtags": [h["hashtag"] for h in hashtags["hashtags"]],
            "upcoming_occasions": [e["name"] for e in events["events"][:3]],
            "content_ideas": [
                {
                    "type": "trending_topic",
                    "idea": "Create content around current trending topics",
                    "examples": ["Share your take on Make in India", "Showcase local artisans"],
                },
                {
                    "type": "occasion_based",
                    "idea": "Plan content for upcoming festivals",
                    "examples": events["content_suggestions"][:2],
                },
                {
                    "type": "engagement",
                    "idea": "Create interactive content",
                    "examples": ["Polls about preferences", "User-generated content campaigns"],
                },
            ],
            "best_posting_times": self._get_best_times(platform),
            "generated_at": datetime.now().isoformat(),
        }
        
        return recommendations
    
    def _get_best_times(self, platform: str) -> List[str]:
        """Get best posting times for platform"""
        times = {
            "instagram": ["9:00 AM", "12:00 PM", "7:00 PM", "9:00 PM"],
            "twitter": ["8:00 AM", "12:00 PM", "5:00 PM", "9:00 PM"],
            "linkedin": ["7:00 AM", "12:00 PM", "5:00 PM"],
            "facebook": ["9:00 AM", "1:00 PM", "4:00 PM", "8:00 PM"],
        }
        return times.get(platform, times["instagram"])
    
    async def analyze_competitor(
        self,
        competitor_handle: str,
        platform: str
    ) -> Dict[str, Any]:
        """
        Analyze competitor (demo implementation)
        
        Args:
            competitor_handle: Competitor's social media handle
            platform: Platform to analyze
            
        Returns:
            Competitor analysis data
        """
        # Demo data - in production, this would call social media APIs
        return {
            "handle": competitor_handle,
            "platform": platform,
            "analysis": {
                "avg_posts_per_week": random.randint(3, 10),
                "avg_engagement_rate": round(random.uniform(2, 8), 2),
                "top_hashtags": random.sample(
                    [h["hashtag"] for h in self.trending_hashtags.get(platform, [])[:10]],
                    min(5, len(self.trending_hashtags.get(platform, [])))
                ),
                "posting_frequency": "Daily" if random.random() > 0.5 else "Multiple times daily",
                "content_types": ["images", "videos", "carousels"],
                "peak_engagement_time": random.choice(["morning", "afternoon", "evening"]),
            },
            "insights": [
                "Competitor posts consistently during peak hours",
                "Heavy use of user-generated content",
                "Festival-themed campaigns drive highest engagement",
            ],
            "is_demo": True,
            "message": "Demo analysis - connect social media APIs for real data",
        }


# Create singleton instance
trend_service = TrendService()
