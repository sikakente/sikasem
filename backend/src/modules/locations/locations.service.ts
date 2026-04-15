import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.location.findMany({ where: { isActive: true } });
  }

  async findById(id: string) {
    const location = await this.prisma.location.findUnique({ where: { id } });
    if (!location) {
      throw new NotFoundException(`Location with id "${id}" not found`);
    }
    return location;
  }

  async findByType(type: string) {
    return this.prisma.location.findMany({
      where: { locationType: type, isActive: true },
    });
  }

  async getUkWarehouse() {
    const location = await this.prisma.location.findFirst({
      where: { name: 'UK Warehouse', isActive: true },
    });
    if (!location) {
      throw new NotFoundException('UK Warehouse location not found');
    }
    return location;
  }

  async getGhanaWarehouse() {
    const location = await this.prisma.location.findFirst({
      where: { name: 'Ghana Warehouse', isActive: true },
    });
    if (!location) {
      throw new NotFoundException('Ghana Warehouse location not found');
    }
    return location;
  }

  async create(dto: CreateLocationDto) {
    return this.prisma.location.create({ data: dto });
  }

  async update(id: string, dto: UpdateLocationDto) {
    await this.findById(id);
    return this.prisma.location.update({ where: { id }, data: dto });
  }
}
