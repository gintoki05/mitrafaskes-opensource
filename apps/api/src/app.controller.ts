import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccessPermission } from '@mitrafaskes/shared';
import { Public, RequirePermission } from './auth/access-control.decorator';
import { MasterIcd10Service } from './master-data/master-icd10.service';

@Controller('api')
export class AppController {
  constructor(private readonly icd10: MasterIcd10Service) {}

  @Get()
  @ApiTags('General')
  @Public()
  getHello(): string {
    return 'Mitra Faskes NestJS API Server Ready';
  }

  // Master ICD-10 Search
  @Get('master/icd10')
  @ApiTags('Master Data')
  @RequirePermission(AccessPermission.RME_READ)
  async getIcd10(@Query('q') q?: string) {
    const results = await this.icd10.list({
      search: q,
      page: 1,
      pageSize: 50,
    });
    return results.items.map(({ code, display, nameIndo, nameEng }) => ({
      code,
      display,
      nameIndo: nameIndo ?? display,
      nameEng,
    }));
  }
}
