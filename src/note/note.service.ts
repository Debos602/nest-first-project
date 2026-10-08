import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../generated/prisma/client';

@Injectable()
export class NoteService {
  private logger = new Logger(NoteService.name);
  constructor(private readonly prismaService: PrismaService) {}

  async create(createNoteDto: CreateNoteDto, userId: number) {
    //create note with userId
    const note = await this.prismaService.note.create({
      data: {
        title: createNoteDto.title,
        body: createNoteDto.body,
        userId,
      },
    });
    this.logger.log(
      `New Note has been created with title: ${createNoteDto.title} by userId: ${userId}`,
    );
    return note;
  }

  // note.service.ts
  async findAll(
    { skip, take }: { skip: number; take: number },
    userId: number,
  ) {
    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.note.findMany({
        where: { userId },
        skip,
        take,
        // orderBy: { created_at: 'desc' },
      }),
      this.prismaService.note.count({ where: { userId } }),
    ]);
    return { items, total, skip, take };
  }

  async findOne(id: number, userId: number) {
    const note = await this.prismaService.note.findFirst({
      where: { id, userId },
    });
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  async update(id: number, dto: UpdateNoteDto, userId: number) {
    await this.findOne(id, userId); // ownership check
    return this.prismaService.note.update({ where: { id }, data: dto });
  }

  async remove(id: number, userId: number) {
    await this.findOne(id, userId); // 404 দেবে note না থাকলে

    try {
      await this.prismaService.note.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Note not found');
      }
      this.logger.error(
        `Failed to delete note ${id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Could not delete note');
    }
  }
}
