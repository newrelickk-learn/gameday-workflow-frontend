

import { graphqlClient } from '@/lib/api/graphql-client';
import type {
  Application,
  CreateApplicationRequest,
  Approval,
  UpdateApprovalRequest,
} from '@/lib/api/types';

const PASSWORD = 'password';

type CompanyUsers = {
  engineer: { id: string; email: string; password: string };
  manager: { id: string; email: string; password: string };
  director: { id: string; email: string; password: string };
  accounting: { id: string; email: string; password: string };
};

const COMPANY_USER_SETS: { companyId: number; users: CompanyUsers }[] = [
  {
    companyId: 1,
    users: {
      engineer: { id: '28151', email: 'engineer@learn.nrkk.technology', password: PASSWORD },
      manager: { id: '21051', email: 'manager@learn.nrkk.technology', password: PASSWORD },
      director: { id: '1051', email: 'director@learn.nrkk.technology', password: PASSWORD },
      accounting: { id: '16051', email: 'accounting@learn.nrkk.technology', password: PASSWORD },
    },
  },
  {
    companyId: 17,
    users: {
      engineer: { id: '28167', email: 'tamura.sota305@learn.nrkk.technology', password: PASSWORD },
      manager: { id: '21067', email: 'fukuda.satoshi@learn.nrkk.technology', password: PASSWORD },
      director: { id: '1067', email: 'saito.takeshi@learn.nrkk.technology', password: PASSWORD },
      accounting: { id: '16067', email: 'ogawa.rie@learn.nrkk.technology', password: PASSWORD },
    },
  },
  {
    companyId: 33,
    users: {
      engineer: { id: '28183', email: 'matsumoto.yuta748@learn.nrkk.technology', password: PASSWORD },
      manager: { id: '21083', email: 'takahashi.shota372@learn.nrkk.technology', password: PASSWORD },
      director: { id: '1083', email: 'endo.shosuke@learn.nrkk.technology', password: PASSWORD },
      accounting: { id: '16083', email: 'nakagawa.yuko@learn.nrkk.technology', password: PASSWORD },
    },
  },
];


type UserCred = { id: string; email: string; password: string };

async function loginAs(user: UserCred): Promise<string> {
  const response = await graphqlClient.auth.login({
    email: user.email,
    password: user.password,
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem('token', response.token);
  }

  return response.token;
}

async function createApplicationAs(
  user: UserCred,
  applicationData: CreateApplicationRequest
): Promise<Application> {
  await loginAs(user);
  return await graphqlClient.applications.createApplication(applicationData);
}

async function getPendingApprovals(user: UserCred, applicationId?: string, maxRetries: number = 5): Promise<Approval[]> {
  await loginAs(user);
  
  if (applicationId) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const approvals = await graphqlClient.approvals.getApprovals();
        const matchingApprovals = approvals.filter(
          (a) => a.status === 'pending' && (!applicationId || a.applicationId === applicationId)
        );
        if (matchingApprovals.length > 0) {
          return matchingApprovals;
        }
      } catch (error) {
        console.log('[Test] Failed to get approvals, retrying...', error);
      }
      
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
  
  const approvals = await graphqlClient.approvals.getApprovals();
  return approvals.filter((a) => a.status === 'pending');
}

async function approveApplication(
  approvalId: string,
  user: UserCred,
  applicationId?: string,
  comment?: string
): Promise<Approval> {
  await loginAs(user);
  let approval: Approval;
  let actualApplicationId = applicationId;
  
  try {
    approval = await graphqlClient.approvals.getApproval(approvalId);
    actualApplicationId = approval.applicationId;
  } catch (error) {
    if (!actualApplicationId) {
      console.error('[Test] Failed to get approval and no applicationId provided:', approvalId);
      throw error;
    }
    console.log('[Test] Failed to get approval, using provided applicationId:', actualApplicationId);
    approval = {
      id: approvalId,
      applicationId: actualApplicationId,
      approverId: user.id,
      status: 'pending',
    } as Approval;
  }
  
  const updateData: UpdateApprovalRequest = {
    status: 'approved',
    approverId: user.id,
    applicationId: actualApplicationId || approval.applicationId,
    comment,
  };

  return await graphqlClient.approvals.updateApproval(approvalId, updateData);
}

async function verifyApplicationStatus(
  applicationId: string,
  expectedStatus: 'pending' | 'approved' | 'rejected',
  expectedCurrentStep?: number,
  expectedTotalSteps?: number
): Promise<void> {
  const application = await graphqlClient.applications.getApplication(applicationId);
  
  expect(application.status).toBe(expectedStatus);
  if (expectedCurrentStep !== undefined && application.currentStep != null) {
    expect(application.currentStep).toBe(expectedCurrentStep);
  }
  if (expectedTotalSteps !== undefined && application.totalSteps != null) {
    expect(application.totalSteps).toBe(expectedTotalSteps);
  }
}

describe('ワークフローシナリオテスト', () => {
  jest.setTimeout(30000);
  
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('出張申請シナリオ', () => {
    COMPANY_USER_SETS.forEach(({ companyId, users }) => {
      it(`エンジニア申請 → 上長承認 → 本部長最終承認のフローが正常に動作する（会社${companyId}）`, async () => {
        await loginAs(users.engineer);

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 14);
        const startDate = futureDate.toISOString().split('T')[0];
        futureDate.setDate(futureDate.getDate() + 2);
        const endDate = futureDate.toISOString().split('T')[0];

        const application = await createApplicationAs(users.engineer, {
          type: 'business-trip',
          title: '東京出張申請',
          description: '技術カンファレンス参加のため東京へ出張',
          startDate: startDate,
          endDate: endDate,
          days: 3,
          applicantId: users.engineer.id,
        });

        expect(application.id).toBeDefined();
        expect(application.type).toBe('business-trip');
        expect(application.status).toBe('pending');

        const initialApp = await graphqlClient.applications.getApplication(application.id);
        expect(initialApp.status).toBe('pending');
        if (initialApp.currentStep != null) {
          expect(initialApp.currentStep).toBeGreaterThanOrEqual(1);
        }

        await loginAs(users.manager);
        const managerApprovals = await getPendingApprovals(users.manager, application.id);
        const managerApproval = managerApprovals.find(
          (a) => a.applicationId === application.id && (a.step === 1 || a.step === 2)
        );
        if (!managerApproval) {
          console.log('[Test] Available approvals:', managerApprovals.map(a => ({ id: a.id, applicationId: a.applicationId, step: a.step })));
          console.log('[Test] Looking for application:', application.id);
        }
        expect(managerApproval).toBeDefined();
        expect(managerApproval?.status).toBe('pending');

        if (managerApproval) {
          await approveApplication(managerApproval.id, users.manager, application.id, '承認します');
        }

        const appAfterManagerApproval = await graphqlClient.applications.getApplication(application.id);
        expect(['pending', 'approved']).toContain(appAfterManagerApproval.status);
        if (appAfterManagerApproval.status === 'pending' && appAfterManagerApproval.currentStep != null) {
          expect(appAfterManagerApproval.currentStep).toBeGreaterThanOrEqual(2);
        }

        await loginAs(users.director);
        const directorApprovals = await getPendingApprovals(users.director, application.id);
        const directorApproval = directorApprovals.find(
          (a) => a.applicationId === application.id && (a.step === 2 || a.step === 3)
        );
        expect(directorApproval).toBeDefined();
        expect(directorApproval?.status).toBe('pending');

        if (directorApproval) {
          await approveApplication(directorApproval.id, users.director, application.id, '最終承認します');
        }

        await verifyApplicationStatus(application.id, 'approved', 3, 3);
      });
    });
  });

  describe('経費申請シナリオ', () => {
    COMPANY_USER_SETS.forEach(({ companyId, users }) => {
      it(`エンジニア申請 → 上長承認 → 経理承認のフローが正常に動作する（会社${companyId}）`, async () => {
        await loginAs(users.engineer);

        const application = await createApplicationAs(users.engineer, {
          type: 'expense',
          title: '交通費・宿泊費精算',
          description: '東京出張の交通費と宿泊費の精算',
          amount: 50000,
          applicantId: users.engineer.id,
        });

        expect(application.id).toBeDefined();
        expect(application.type).toBe('expense');
        expect(application.status).toBe('pending');
        expect(application.amount).toBe(50000);

        const initialApp = await graphqlClient.applications.getApplication(application.id);
        expect(initialApp.status).toBe('pending');
        if (initialApp.currentStep != null) {
          expect(initialApp.currentStep).toBeGreaterThanOrEqual(1);
        }

        await loginAs(users.manager);
        const managerApprovals = await getPendingApprovals(users.manager, application.id);
        const managerApproval = managerApprovals.find(
          (a) => a.applicationId === application.id && (a.step === 1 || a.step === 2)
        );
        if (!managerApproval) {
          console.log('[Test] Available approvals:', managerApprovals.map(a => ({ id: a.id, applicationId: a.applicationId, step: a.step })));
          console.log('[Test] Looking for application:', application.id);
        }
        expect(managerApproval).toBeDefined();

        if (managerApproval) {
          await approveApplication(managerApproval.id, users.manager, application.id, '承認します');
        }

        await loginAs(users.accounting);
        const accountingApprovals = await getPendingApprovals(users.accounting, application.id);
        const accountingApproval = accountingApprovals.find(
          (a) => a.applicationId === application.id && (a.step === 2 || a.step === 3)
        );
        expect(accountingApproval).toBeDefined();

        if (accountingApproval) {
          await approveApplication(accountingApproval.id, users.accounting, application.id, '承認します');
        }

        await verifyApplicationStatus(application.id, 'approved', 3, 3);
      });
    });
  });

  describe('休暇申請シナリオ', () => {
    COMPANY_USER_SETS.forEach(({ companyId, users }) => {
      it(`エンジニア申請 → 上長承認のフローが正常に動作する（会社${companyId}）`, async () => {
        await loginAs(users.engineer);

        const application = await createApplicationAs(users.engineer, {
          type: 'vacation',
          title: '有給休暇申請',
          description: '2024年4月20日から4月22日まで',
          startDate: '2024-04-20',
          endDate: '2024-04-22',
          days: 3,
          applicantId: users.engineer.id,
        });

        expect(application.id).toBeDefined();
        expect(application.type).toBe('vacation');
        expect(application.status).toBe('pending');
        expect(application.days).toBe(3);

        const initialApp = await graphqlClient.applications.getApplication(application.id);
        expect(initialApp.status).toBe('pending');
        if (initialApp.currentStep != null) {
          expect(initialApp.currentStep).toBeGreaterThanOrEqual(1);
        }

        await loginAs(users.manager);
        const managerApprovals = await getPendingApprovals(users.manager, application.id);
        const managerApproval = managerApprovals.find(
          (a) => a.applicationId === application.id && (a.step === 1 || a.step === 2)
        );
        if (!managerApproval) {
          console.log('[Test] Available approvals:', managerApprovals.map(a => ({ id: a.id, applicationId: a.applicationId, step: a.step })));
          console.log('[Test] Looking for application:', application.id);
        }
        expect(managerApproval).toBeDefined();

        if (managerApproval) {
          await approveApplication(managerApproval.id, users.manager, application.id, '承認します');
        }

        await verifyApplicationStatus(application.id, 'approved', 2, 2);
      });
    });
  });

  describe('プロモーション申請シナリオ', () => {
    COMPANY_USER_SETS.forEach(({ companyId, users }) => {
      it(`上長申請 → 本部長承認のフローが正常に動作する（会社${companyId}）`, async () => {
        await loginAs(users.manager);

        const application = await createApplicationAs(users.manager, {
          type: 'promotion',
          title: '開発エンジニアAの昇格申請',
          description: '優秀なパフォーマンスにより、シニアエンジニアへの昇格を申請',
          applicantId: users.manager.id,
        });

        expect(application.id).toBeDefined();
        expect(application.type).toBe('promotion');
        expect(application.status).toBe('pending');

        const initialApp = await graphqlClient.applications.getApplication(application.id);
        expect(initialApp.status).toBe('pending');
        if (initialApp.currentStep != null) {
          expect(initialApp.currentStep).toBeGreaterThanOrEqual(1);
        }

        await loginAs(users.director);
        const directorApprovals = await getPendingApprovals(users.director, application.id);
        const directorApproval = directorApprovals.find(
          (a) => a.applicationId === application.id && (a.step === 1 || a.step === 2)
        );
        expect(directorApproval).toBeDefined();

        if (directorApproval) {
          await approveApplication(directorApproval.id, users.director, application.id, '承認します');
        }

        await verifyApplicationStatus(application.id, 'approved', 2, 2);
      });
    });
  });
});

