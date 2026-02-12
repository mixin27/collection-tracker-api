import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { CreatePresignedUrlDto } from './dto/storage.dto';

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly region: string;
  private readonly bucket: string;
  private readonly bucketUrl?: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('aws.region') || 'us-east-1';
    this.bucket = this.configService.get<string>('aws.s3.bucket') || '';
    this.bucketUrl = this.configService.get<string>('aws.s3.bucketUrl');
    const accessKeyId = this.configService.get<string>('aws.accessKeyId');
    const secretAccessKey =
      this.configService.get<string>('aws.secretAccessKey');

    if (!this.bucket) {
      throw new InternalServerErrorException('AWS S3 bucket is not configured');
    }

    this.s3Client = new S3Client({
      region: this.region,
      ...(accessKeyId && secretAccessKey
        ? {
            credentials: {
              accessKeyId,
              secretAccessKey,
            },
          }
        : {}),
    });
  }

  async createPresignedUploadUrl(userId: string, dto: CreatePresignedUrlDto) {
    const expiresIn = dto.expiresIn ?? 900;
    const key = this.buildObjectKey(userId, dto.fileName, dto.folder);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: dto.contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
    const fileUrl = this.buildFileUrl(key);

    return {
      uploadUrl,
      key,
      fileUrl,
      expiresIn,
      method: 'PUT',
    };
  }

  async deleteFile(userId: string, key: string) {
    if (!key.startsWith(`users/${userId}/`)) {
      throw new ForbiddenException(
        'You can only delete files inside your own storage namespace',
      );
    }

    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    return {
      deleted: true,
      key,
    };
  }

  private buildObjectKey(userId: string, fileName: string, folder?: string) {
    const sanitizedFileName = fileName
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_');
    const safeFolder = folder
      ? folder
          .split('/')
          .map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, '_'))
          .filter(Boolean)
          .join('/')
      : '';

    const id = randomUUID();
    const prefix = safeFolder ? `users/${userId}/${safeFolder}` : `users/${userId}`;

    return `${prefix}/${id}-${sanitizedFileName}`;
  }

  private buildFileUrl(key: string) {
    if (this.bucketUrl) {
      const normalized = this.bucketUrl.endsWith('/')
        ? this.bucketUrl.slice(0, -1)
        : this.bucketUrl;
      return `${normalized}/${key}`;
    }

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
