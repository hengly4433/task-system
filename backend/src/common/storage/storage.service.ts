import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface UploadResult {
  filePath: string;
  publicUrl: string;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private supabase: SupabaseClient | null = null;
  private readonly storageType: string;
  private readonly bucketName = 'attachments';

  constructor(private readonly configService: ConfigService) {
    this.storageType = this.configService.get<string>('APP_STORAGE_TYPE', 'local');
  }

  async onModuleInit() {
    if (this.storageType === 'supabase') {
      const supabaseUrl = this.configService.get<string>('APP_STORAGE_SUPABASE_URL');
      const supabaseKey = this.configService.get<string>('APP_STORAGE_SUPABASE_KEY');

      if (!supabaseUrl || !supabaseKey) {
        this.logger.warn('Supabase credentials not configured. File uploads will fail.');
        return;
      }

      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.logger.log('Supabase storage initialized');

      // Ensure bucket exists
      await this.ensureBucketExists();
    } else {
      this.logger.log('Using local storage (files stored as paths only)');
    }
  }

  private async ensureBucketExists(): Promise<void> {
    if (!this.supabase) return;

    const { data: buckets } = await this.supabase.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === this.bucketName);

    if (!exists) {
      const { error } = await this.supabase.storage.createBucket(this.bucketName, {
        public: true,
        allowedMimeTypes: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.*', 'text/*'],
        fileSizeLimit: 10 * 1024 * 1024, // 10MB
      });
      if (error) {
        this.logger.error(`Failed to create bucket: ${error.message}`);
      } else {
        this.logger.log(`Created storage bucket: ${this.bucketName}`);
      }
    }
  }

  async uploadFile(
    file: Buffer,
    fileName: string,
    mimeType: string,
    folder: string = 'tasks',
  ): Promise<UploadResult> {
    const uniqueFileName = `${folder}/${Date.now()}_${fileName}`;

    this.logger.log(`Uploading file: ${uniqueFileName}, type: ${mimeType}, size: ${file.length} bytes`);
    this.logger.log(`Storage type: ${this.storageType}, Supabase client: ${this.supabase ? 'initialized' : 'not initialized'}`);

    if (this.storageType === 'supabase' && this.supabase) {
      try {
        const { data, error } = await this.supabase.storage
          .from(this.bucketName)
          .upload(uniqueFileName, file, {
            contentType: mimeType,
            upsert: false,
          });

        if (error) {
          this.logger.error(`Upload failed: ${error.message}`);
          throw new Error(`File upload failed: ${error.message}`);
        }

        this.logger.log(`Upload successful: ${data.path}`);

        const { data: urlData } = this.supabase.storage
          .from(this.bucketName)
          .getPublicUrl(data.path);

        this.logger.log(`Public URL: ${urlData.publicUrl}`);

        return {
          filePath: data.path,
          publicUrl: urlData.publicUrl,
        };
      } catch (err: any) {
        this.logger.error(`Upload exception: ${err.message}`);
        throw err;
      }
    }

    // Local storage fallback - just return the path
    this.logger.log(`Using local storage fallback for: ${uniqueFileName}`);
    return {
      filePath: uniqueFileName,
      publicUrl: `/uploads/${uniqueFileName}`,
    };
  }

  async deleteFile(filePath: string): Promise<void> {
    if (this.storageType === 'supabase' && this.supabase) {
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        this.logger.error(`Delete failed: ${error.message}`);
      }
    }
  }

  getPublicUrl(filePath: string): string {
    if (this.storageType === 'supabase' && this.supabase) {
      const { data } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);
      return data.publicUrl;
    }
    return `/uploads/${filePath}`;
  }

  isSupabaseEnabled(): boolean {
    return this.storageType === 'supabase' && this.supabase !== null;
  }
}
