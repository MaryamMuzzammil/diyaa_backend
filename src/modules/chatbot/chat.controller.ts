import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatActorService } from './chat-actor.service';
import { ChatService } from './chat.service';
import { SendChatDto } from './dto/send-chat.dto';

type JwtActor = { sub: number; email: string; role: string };

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(
    private chatService: ChatService,
    private actorService: ChatActorService,
  ) {}

  /** Main endpoint for frontend chatbot UI */
  @Post('message')
  async sendMessage(
    @Request() req: { user: JwtActor },
    @Body() body: SendChatDto,
  ) {
    const actor = await this.actorService.resolve(req.user);
    const result = await this.chatService.chatAndSave(actor, body.question);
    return {
      message: 'OK',
      ...result,
    };
  }

  /** Recent messages for the logged-in user */
  @Get('history')
  async history(@Request() req: { user: JwtActor }) {
    const rows = await this.chatService.getHistory(req.user.sub);
    return { messages: rows };
  }
}
