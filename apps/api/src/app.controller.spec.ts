import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { MasterIcd10Service } from './master-data/master-icd10.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: MasterIcd10Service,
          useValue: {
            list: jest.fn(),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('reports that the API is ready', () => {
      expect(appController.getHello()).toBe(
        'Mitra Faskes NestJS API Server Ready',
      );
    });
  });
});
