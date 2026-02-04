import { describe, it, expect } from 'vitest';
import {
  demoUser,
  demoOffices,
  demoStaffList,
  demoMasters,
  demoEvaluationRecords,
  demoInputs,
  demoHistory
} from '../utils/demoData';
import { BusinessType } from '../types';

describe('demoData', () => {
  describe('demoUser', () => {
    it('管理者権限を持つ', () => {
      expect(demoUser.role).toBe('admin');
    });

    it('必須フィールドが設定されている', () => {
      expect(demoUser.uid).toBeDefined();
      expect(demoUser.email).toBeDefined();
      expect(demoUser.displayName).toBeDefined();
      expect(demoUser.createdAt).toBeDefined();
    });
  });

  describe('demoOffices', () => {
    it('訪問介護と訪問看護の事業所がある', () => {
      const homeCareOffice = demoOffices.find(o => o.type === BusinessType.HOME_CARE);
      const homeNursingOffice = demoOffices.find(o => o.type === BusinessType.HOME_NURSING);

      expect(homeCareOffice).toBeDefined();
      expect(homeNursingOffice).toBeDefined();
    });

    it('各事業所に固有のIDがある', () => {
      const ids = demoOffices.map(o => o.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('demoStaffList', () => {
    it('複数の職員が登録されている', () => {
      expect(demoStaffList.length).toBeGreaterThan(0);
    });

    it('各職員に必須フィールドが設定されている', () => {
      for (const staff of demoStaffList) {
        expect(staff.id).toBeDefined();
        expect(staff.officeId).toBeDefined();
        expect(staff.name).toBeDefined();
        expect(staff.baseSalary).toBeGreaterThan(0);
        expect(Array.isArray(staff.qualifications)).toBe(true);
      }
    });

    it('各職員に基本給履歴がある', () => {
      for (const staff of demoStaffList) {
        expect(staff.baseSalaryHistory).toBeDefined();
        expect(staff.baseSalaryHistory!.length).toBeGreaterThan(0);
      }
    });

    it('基本給履歴は時系列順になっている', () => {
      for (const staff of demoStaffList) {
        const history = staff.baseSalaryHistory!;
        for (let i = 1; i < history.length; i++) {
          expect(history[i].effectiveMonth >= history[i - 1].effectiveMonth).toBe(true);
        }
      }
    });

    it('職員が正しい事業所に紐づいている', () => {
      for (const staff of demoStaffList) {
        const office = demoOffices.find(o => o.id === staff.officeId);
        expect(office).toBeDefined();
      }
    });

    it('訪問介護と訪問看護の両方に職員がいる', () => {
      const homeCareOffice = demoOffices.find(o => o.type === BusinessType.HOME_CARE);
      const homeNursingOffice = demoOffices.find(o => o.type === BusinessType.HOME_NURSING);

      const homeCareStaff = demoStaffList.filter(s => s.officeId === homeCareOffice?.id);
      const homeNursingStaff = demoStaffList.filter(s => s.officeId === homeNursingOffice?.id);

      expect(homeCareStaff.length).toBeGreaterThan(0);
      expect(homeNursingStaff.length).toBeGreaterThan(0);
    });
  });

  describe('demoMasters', () => {
    it('訪問介護と訪問看護のマスタがある', () => {
      expect(demoMasters[BusinessType.HOME_CARE]).toBeDefined();
      expect(demoMasters[BusinessType.HOME_NURSING]).toBeDefined();
    });

    it('各業種に資格マスタがある', () => {
      expect(demoMasters[BusinessType.HOME_CARE].qualifications.length).toBeGreaterThan(0);
      expect(demoMasters[BusinessType.HOME_NURSING].qualifications.length).toBeGreaterThan(0);
    });

    it('資格マスタに優先度が設定されている', () => {
      for (const qual of demoMasters[BusinessType.HOME_CARE].qualifications) {
        expect(qual.priority).toBeDefined();
        expect(qual.priority).toBeGreaterThan(0);
      }
    });

    it('各業種に勤怠条件マスタがある', () => {
      expect(demoMasters[BusinessType.HOME_CARE].attendanceConditions.length).toBeGreaterThan(0);
      expect(demoMasters[BusinessType.HOME_NURSING].attendanceConditions.length).toBeGreaterThan(0);
    });

    it('各業種に業績評価マスタがある', () => {
      expect(demoMasters[BusinessType.HOME_CARE].performanceEvaluations.length).toBeGreaterThan(0);
      expect(demoMasters[BusinessType.HOME_NURSING].performanceEvaluations.length).toBeGreaterThan(0);
    });

    it('各業種に評価期間がある', () => {
      expect(demoMasters[BusinessType.HOME_CARE].periods.length).toBeGreaterThan(0);
      expect(demoMasters[BusinessType.HOME_NURSING].periods.length).toBeGreaterThan(0);
    });

    it('評価期間にeditingとlockedのステータスがある', () => {
      const homeCareStatuses = demoMasters[BusinessType.HOME_CARE].periods.map(p => p.status);
      expect(homeCareStatuses).toContain('editing');
      expect(homeCareStatuses).toContain('locked');
    });
  });

  describe('demoEvaluationRecords', () => {
    it('評価レコードが存在する', () => {
      expect(Object.keys(demoEvaluationRecords).length).toBeGreaterThan(0);
    });

    it('評価レコードのキーが正しい形式', () => {
      for (const key of Object.keys(demoEvaluationRecords)) {
        // 形式: {periodId}_{staffId}
        expect(key).toMatch(/^.+_.+$/);
      }
    });

    it('評価レコードに必須フィールドがある', () => {
      for (const record of Object.values(demoEvaluationRecords)) {
        expect(record.staffId).toBeDefined();
        expect(record.officeId).toBeDefined();
        expect(record.name).toBeDefined();
        expect(record.baseSalary).toBeGreaterThan(0);
      }
    });
  });

  describe('demoInputs', () => {
    it('入力データが存在する', () => {
      expect(Object.keys(demoInputs).length).toBeGreaterThan(0);
    });

    it('入力データのキーが正しい形式', () => {
      for (const key of Object.keys(demoInputs)) {
        // 形式: {periodId}_{staffId}
        expect(key).toMatch(/^.+_.+$/);
      }
    });

    it('入力データに勤怠と業績の入力がある', () => {
      for (const input of Object.values(demoInputs)) {
        expect(input.attendanceInputs).toBeDefined();
        expect(input.performanceInputs).toBeDefined();
        expect(typeof input.attendanceInputs).toBe('object');
        expect(typeof input.performanceInputs).toBe('object');
      }
    });
  });

  describe('demoHistory', () => {
    it('履歴データが存在する', () => {
      expect(demoHistory.length).toBeGreaterThan(0);
    });

    it('履歴データに必須フィールドがある', () => {
      for (const entry of demoHistory) {
        expect(entry.id).toBeDefined();
        expect(entry.officeId).toBeDefined();
        expect(entry.officeName).toBeDefined();
        expect(entry.timestamp).toBeDefined();
        expect(entry.period).toBeDefined();
        expect(entry.masterSnapshot).toBeDefined();
        expect(entry.recordsSnapshot).toBeDefined();
        expect(entry.inputs).toBeDefined();
      }
    });

    it('履歴が正しい事業所に紐づいている', () => {
      for (const entry of demoHistory) {
        const office = demoOffices.find(o => o.id === entry.officeId);
        expect(office).toBeDefined();
        expect(entry.officeName).toBe(office?.name);
      }
    });
  });

  describe('データ整合性', () => {
    it('職員の資格がマスタに存在する', () => {
      for (const staff of demoStaffList) {
        const office = demoOffices.find(o => o.id === staff.officeId);
        if (!office) continue;

        const master = demoMasters[office.type];
        const qualificationIds = master.qualifications.map(q => q.id);

        for (const qualId of staff.qualifications) {
          expect(qualificationIds).toContain(qualId);
        }
      }
    });

    it('評価レコードの職員がスタッフリストに存在する', () => {
      const staffIds = demoStaffList.map(s => s.id);

      for (const record of Object.values(demoEvaluationRecords)) {
        expect(staffIds).toContain(record.staffId);
      }
    });

    it('入力データの職員がスタッフリストに存在する', () => {
      const staffIds = demoStaffList.map(s => s.id);

      for (const input of Object.values(demoInputs)) {
        expect(staffIds).toContain(input.staffId);
      }
    });

    it('入力データの勤怠IDがマスタに存在する', () => {
      for (const [key, input] of Object.entries(demoInputs)) {
        const periodId = key.split('_')[0];
        const staffId = key.split('_')[1];
        const staff = demoStaffList.find(s => s.id === staffId);
        if (!staff) continue;

        const office = demoOffices.find(o => o.id === staff.officeId);
        if (!office) continue;

        const master = demoMasters[office.type];
        const attendanceIds = master.attendanceConditions.map(a => a.id);

        for (const attId of Object.keys(input.attendanceInputs)) {
          expect(attendanceIds).toContain(attId);
        }
      }
    });

    it('入力データの業績IDがマスタに存在する', () => {
      for (const [key, input] of Object.entries(demoInputs)) {
        const staffId = key.split('_')[1];
        const staff = demoStaffList.find(s => s.id === staffId);
        if (!staff) continue;

        const office = demoOffices.find(o => o.id === staff.officeId);
        if (!office) continue;

        const master = demoMasters[office.type];
        const performanceIds = master.performanceEvaluations.map(p => p.id);

        for (const perfId of Object.keys(input.performanceInputs)) {
          expect(performanceIds).toContain(perfId);
        }
      }
    });
  });
});
