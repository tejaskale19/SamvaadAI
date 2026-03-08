"""
S3 Service for SAMVAAD AI
Handles file storage for datasets, generated outputs, and logs
"""

import boto3
import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, BinaryIO
from botocore.exceptions import ClientError
import uuid

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class S3Service:
    """Service for AWS S3 storage operations"""
    
    def __init__(self):
        """Initialize S3 client"""
        self.client = boto3.client(
            "s3",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        self.bucket_name = settings.S3_BUCKET_NAME
        self.datasets_prefix = settings.S3_DATASETS_PREFIX
        self.outputs_prefix = settings.S3_OUTPUTS_PREFIX
        self.logs_prefix = settings.S3_LOGS_PREFIX
    
    def _ensure_bucket_exists(self) -> bool:
        """Ensure the S3 bucket exists"""
        try:
            self.client.head_bucket(Bucket=self.bucket_name)
            return True
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            if error_code == "404":
                # Bucket doesn't exist, try to create it
                try:
                    if settings.AWS_REGION == "us-east-1":
                        self.client.create_bucket(Bucket=self.bucket_name)
                    else:
                        self.client.create_bucket(
                            Bucket=self.bucket_name,
                            CreateBucketConfiguration={
                                "LocationConstraint": settings.AWS_REGION
                            }
                        )
                    logger.info(f"Created S3 bucket: {self.bucket_name}")
                    return True
                except ClientError as create_error:
                    logger.error(f"Failed to create bucket: {create_error}")
                    return False
            logger.error(f"Bucket check failed: {e}")
            return False
    
    async def upload_file(
        self,
        file_content: BinaryIO,
        filename: str,
        prefix: str = "",
        content_type: Optional[str] = None,
        metadata: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Upload a file to S3
        
        Args:
            file_content: File content to upload
            filename: Name for the file
            prefix: S3 key prefix (folder)
            content_type: MIME type of the file
            metadata: Additional metadata
            
        Returns:
            Upload result with S3 URL
        """
        try:
            key = f"{prefix}{filename}"
            
            extra_args = {}
            if content_type:
                extra_args["ContentType"] = content_type
            if metadata:
                extra_args["Metadata"] = metadata
            
            self.client.upload_fileobj(
                file_content,
                self.bucket_name,
                key,
                ExtraArgs=extra_args if extra_args else None
            )
            
            url = f"https://{self.bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
            
            return {
                "success": True,
                "key": key,
                "url": url,
                "bucket": self.bucket_name,
            }
            
        except ClientError as e:
            logger.error(f"S3 upload error: {e}")
            return {"success": False, "error": str(e)}
    
    async def upload_json(
        self,
        data: Dict[str, Any],
        filename: str,
        prefix: str = ""
    ) -> Dict[str, Any]:
        """Upload JSON data to S3"""
        try:
            key = f"{prefix}{filename}"
            
            self.client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=json.dumps(data, indent=2, default=str),
                ContentType="application/json"
            )
            
            url = f"https://{self.bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
            
            return {
                "success": True,
                "key": key,
                "url": url,
            }
            
        except ClientError as e:
            logger.error(f"S3 upload_json error: {e}")
            return {"success": False, "error": str(e)}
    
    async def download_file(self, key: str) -> Dict[str, Any]:
        """Download a file from S3"""
        try:
            response = self.client.get_object(Bucket=self.bucket_name, Key=key)
            content = response["Body"].read()
            
            return {
                "success": True,
                "content": content,
                "content_type": response.get("ContentType"),
                "metadata": response.get("Metadata", {}),
            }
            
        except ClientError as e:
            logger.error(f"S3 download error: {e}")
            return {"success": False, "error": str(e)}
    
    async def download_json(self, key: str) -> Dict[str, Any]:
        """Download and parse JSON from S3"""
        result = await self.download_file(key)
        if result.get("success"):
            try:
                data = json.loads(result["content"].decode("utf-8"))
                return {"success": True, "data": data}
            except json.JSONDecodeError as e:
                return {"success": False, "error": f"JSON parse error: {e}"}
        return result
    
    async def list_files(
        self,
        prefix: str = "",
        max_files: int = 100
    ) -> Dict[str, Any]:
        """List files in S3 bucket with prefix"""
        try:
            response = self.client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix,
                MaxKeys=max_files
            )
            
            files = []
            for obj in response.get("Contents", []):
                files.append({
                    "key": obj["Key"],
                    "size": obj["Size"],
                    "last_modified": obj["LastModified"].isoformat(),
                })
            
            return {
                "success": True,
                "files": files,
                "count": len(files),
                "truncated": response.get("IsTruncated", False),
            }
            
        except ClientError as e:
            logger.error(f"S3 list error: {e}")
            return {"success": False, "error": str(e), "files": []}
    
    async def delete_file(self, key: str) -> Dict[str, Any]:
        """Delete a file from S3"""
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=key)
            return {"success": True, "deleted_key": key}
        except ClientError as e:
            logger.error(f"S3 delete error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_presigned_url(
        self,
        key: str,
        expiration: int = 3600,
        operation: str = "get_object"
    ) -> Dict[str, Any]:
        """Generate a presigned URL for S3 object"""
        try:
            url = self.client.generate_presigned_url(
                operation,
                Params={"Bucket": self.bucket_name, "Key": key},
                ExpiresIn=expiration
            )
            return {
                "success": True,
                "url": url,
                "expires_in": expiration,
            }
        except ClientError as e:
            logger.error(f"S3 presigned URL error: {e}")
            return {"success": False, "error": str(e)}
    
    # =========================================================================
    # SPECIFIC STORAGE OPERATIONS
    # =========================================================================
    
    async def save_dataset(
        self,
        dataset_name: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Save a dataset to the datasets folder"""
        filename = f"{dataset_name}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        return await self.upload_json(data, filename, self.datasets_prefix)
    
    async def save_generated_output(
        self,
        user_id: str,
        content_id: str,
        output_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Save generated content output"""
        filename = f"{user_id}/{content_id}.json"
        return await self.upload_json(output_data, filename, self.outputs_prefix)
    
    async def save_log(
        self,
        log_type: str,
        log_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Save a log entry"""
        date_str = datetime.utcnow().strftime("%Y/%m/%d")
        filename = f"{log_type}/{date_str}/{uuid.uuid4().hex[:8]}.json"
        
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "type": log_type,
            "data": log_data,
        }
        
        return await self.upload_json(log_entry, filename, self.logs_prefix)
    
    async def get_datasets(self) -> Dict[str, Any]:
        """List all datasets"""
        return await self.list_files(self.datasets_prefix)
    
    async def get_user_outputs(self, user_id: str) -> Dict[str, Any]:
        """Get all outputs for a user"""
        prefix = f"{self.outputs_prefix}{user_id}/"
        return await self.list_files(prefix)


# Create singleton instance
s3_service = S3Service()
