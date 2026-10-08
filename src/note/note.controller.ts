// note.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { NoteService } from './note.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@UseGuards(AuthGuard) // পুরো controller-এ একবারে
@Controller('api/notes')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Post()
  create(
    @Body() dto: CreateNoteDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.noteService.create(dto, req.user.sub);
  }

  @Get()
  findAll(
    @Request() req: { user: { sub: number } },
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take: number,
  ) {
    return this.noteService.findAll({ skip, take }, req.user.sub);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.noteService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNoteDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.noteService.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.noteService.remove(id, req.user.sub);
  }
}
