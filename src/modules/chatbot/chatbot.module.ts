import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstituteAdmin } from '../institute-admin/institute-admin.entity';
import { Parent } from '../parent/parent.entity';
import { Student } from '../student/student.entity';
import { Teacher } from '../teacher/teacher.entity';
import { User } from '../users/users.entity';
import { ChatActorService } from './chat-actor.service';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatMessage } from './entities/chat-message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatMessage,
      User,
      Student,
      Teacher,
      Parent,
      InstituteAdmin,
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatActorService],
  exports: [ChatService],
})
export class ChatbotModule {}
