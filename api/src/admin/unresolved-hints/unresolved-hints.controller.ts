import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UnresolvedHintsService } from './unresolved-hints.service';
import {
  ListUnresolvedHintsDto,
  CreateConceptFromHintDto,
  AddAliasFromHintDto,
  IgnoreHintDto,
  BulkIgnoreHintsDto,
  BulkApproveHintsDto,
} from './dto';

@Controller('admin/unresolved-hints')
export class UnresolvedHintsController {
  constructor(private readonly service: UnresolvedHintsService) {}

  @Get()
  async list(@Query() query: ListUnresolvedHintsDto) {
    return this.service.listUnresolvedHints(query);
  }

  @Get('statistics')
  async getStatistics() {
    return this.service.getStatistics();
  }

  @Post(':id/create-concept')
  @HttpCode(HttpStatus.OK)
  async createConcept(
    @Param('id') id: string,
    @Body() dto: CreateConceptFromHintDto,
  ) {
    return this.service.createConceptFromHint(id, dto);
  }

  @Post(':id/add-alias')
  @HttpCode(HttpStatus.OK)
  async addAlias(@Param('id') id: string, @Body() dto: AddAliasFromHintDto) {
    return this.service.addAliasFromHint(id, dto);
  }

  @Patch(':id/ignore')
  @HttpCode(HttpStatus.OK)
  async ignore(@Param('id') id: string, @Body() dto: IgnoreHintDto) {
    return this.service.ignoreHint(id, dto);
  }

  @Post('bulk-ignore')
  @HttpCode(HttpStatus.OK)
  async bulkIgnore(@Body() dto: BulkIgnoreHintsDto) {
    return this.service.bulkIgnoreHints(dto);
  }

  @Post('bulk-approve')
  @HttpCode(HttpStatus.OK)
  async bulkApprove(@Body() dto: BulkApproveHintsDto) {
    return this.service.bulkApproveHints(dto);
  }
}
