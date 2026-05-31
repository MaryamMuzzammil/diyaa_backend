import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export enum RewardTypeDto {
  BADGE = 'badge',
  POINTS = 'points',
  GIFT = 'gift',
}

export class AwardRewardDto {
  @Type(() => Number)
  @IsInt()
  student_id: number;

  @IsEnum(RewardTypeDto)
  type: RewardTypeDto;

  @IsString()
  @MinLength(2)
  title: string;

  @IsOptional()
  @IsString()
  reward_key?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  points?: number;
}
