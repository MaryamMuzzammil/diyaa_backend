import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CompleteGameDto {
  @IsString()
  subject: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  level_number: number;

  @IsString()
  skill: string;

  /** 1..N within that skill */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  game_index: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  score: number;

  @IsBoolean()
  won: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  duration_minutes?: number;
}
