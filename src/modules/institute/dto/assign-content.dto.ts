import { IsString } from 'class-validator';

export class AssignContentDto {
  @IsString()
  assigned_to: string;
}
