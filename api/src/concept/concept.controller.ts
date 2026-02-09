/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ConceptService } from './concept.service';
import { CreateConceptDto } from './dto/create-concept.dto';
import { UpdateConceptDto } from './dto/update-concept.dto';
import { AddAliasDto } from './dto/add-alias.dto';
import { MergeConceptsDto } from './dto/merge-concepts.dto';
import { ConceptType, ConceptStatus } from '@prisma/client';

@Controller('admin/concepts')
export class ConceptController {
  constructor(private readonly conceptService: ConceptService) {}

  @Get()
  async getAllConcepts(
    @Query('search') search?: string,
    @Query('type') type?: ConceptType,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    const result = await this.conceptService.getAllConcepts({
      search,
      type,
      status: status as ConceptStatus | undefined,
      sortBy,
      sortOrder,
      limit,
      offset,
    });

    return {
      success: true,
      ...result,
    };
  }

  @Get('search')
  async searchConcepts(@Query('q') query: string) {
    console.log(query, 'search');

    const concepts = await this.conceptService.searchConcepts(query);
    return {
      success: true,
      concepts,
    };
  }

  @Get('merge-preview')
  async getMergePreview(
    @Query('sourceId') sourceId: string,
    @Query('targetId') targetId: string,
  ) {
    const preview = await this.conceptService.getMergePreview(
      sourceId,
      targetId,
    );
    return {
      success: true,
      preview,
    };
  }

  @Get(':id')
  async getConceptById(@Param('id') id: string) {
    const concept = await this.conceptService.getConceptById(id);
    return {
      success: true,
      concept,
    };
  }

  @Post()
  async createConcept(@Body() dto: CreateConceptDto) {
    const concept = await this.conceptService.createConcept(dto);
    return {
      success: true,
      concept,
    };
  }

  @Patch(':id')
  async updateConcept(@Param('id') id: string, @Body() dto: UpdateConceptDto) {
    const concept = await this.conceptService.updateConcept(id, dto);
    return {
      success: true,
      concept,
    };
  }

  @Post('merge')
  async mergeConcepts(@Body() dto: MergeConceptsDto) {
    await this.conceptService.mergeConcepts(dto.sourceId, dto.targetId);
    return {
      success: true,
      message: 'Concepts merged successfully',
    };
  }

  @Post(':id/alias')
  async addAlias(@Param('id') conceptId: string, @Body() dto: AddAliasDto) {
    const alias = await this.conceptService.addAlias(conceptId, dto);
    return {
      success: true,
      alias,
    };
  }

  @Delete(':id/alias/:aliasId')
  async disableAlias(
    @Param('id') conceptId: string,
    @Param('aliasId') aliasId: string,
  ) {
    await this.conceptService.disableAlias(conceptId, aliasId);
    return {
      success: true,
      message: 'Alias disabled successfully',
    };
  }
}
