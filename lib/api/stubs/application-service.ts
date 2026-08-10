import type { Application, CreateApplicationRequest, Approval } from '../types';
import { approvals } from './workflow-service';
import { stubUserService } from './user-service';

// 申請データ
const applications: Record<string, Application> = {
  '1': {
    id: '1',
    type: 'business-trip',
    title: '東京出張申請',
    description: '技術カンファレンス参加のため東京へ出張',
    startDate: '2024-04-15',
    endDate: '2024-04-17',
    days: 3,
    status: 'pending',
    applicantId: '28151',
    applicantName: '開発エンジニア',
    applicantDepartment: '開発組織',
    currentStep: 1,
    totalSteps: 1,
    nextApproverId: '21051',
    nextApproverName: '上長',
    nextApproverDepartment: '開発組織',
    createdAt: '2024-04-01T00:00:00Z',
    updatedAt: '2024-04-01T00:00:00Z',
  },
  '2': {
    id: '2',
    type: 'expense',
    title: '交通費・宿泊費精算',
    description: '東京出張の交通費と宿泊費の精算',
    amount: 85000,
    status: 'pending',
    applicantId: '28151',
    applicantName: '開発エンジニア',
    applicantDepartment: '開発組織',
    currentStep: 1,
    totalSteps: 2,
    nextApproverId: '21051',
    nextApproverName: '上長',
    nextApproverDepartment: '開発組織',
    createdAt: '2024-04-18T00:00:00Z',
    updatedAt: '2024-04-18T00:00:00Z',
  },
  '3': {
    id: '3',
    type: 'promotion',
    title: '開発エンジニアの昇格申請',
    description: '優秀なパフォーマンスにより、シニアエンジニアへの昇格を申請',
    status: 'pending',
    applicantId: '21051',
    applicantName: '上長',
    applicantDepartment: '開発組織',
    currentStep: 1,
    totalSteps: 1,
    nextApproverId: '1051',
    nextApproverName: '本部長',
    nextApproverDepartment: '開発組織',
    createdAt: '2024-04-20T00:00:00Z',
    updatedAt: '2024-04-20T00:00:00Z',
  },
};

export const stubApplicationService = {
  async getApplications(): Promise<Application[]> {
    return Object.values(applications);
  },

  async getApplication(id: string): Promise<Application> {
    return applications[id] || applications['1'];
  },

  async createApplication(data: CreateApplicationRequest): Promise<Application> {
    const applicationId = String(Date.now());
    const now = new Date().toISOString();
    
    // 申請者のCompanyIdを取得
    const applicant = await stubUserService.getUser(data.applicantId);
    const companyId = applicant.companyId || 1;
    
    // CompanyIdに基づいて承認者IDを計算する関数
    const getApproverIdByRole = (role: 'manager' | 'director' | 'accounting', companyId: number): string => {
      const companyIdClamped = Math.max(1, Math.min(50, companyId));
      switch (role) {
        case 'manager':
          return String(21051 + companyIdClamped - 1); // 上長: 21051-21100
        case 'director':
          return String(1051 + companyIdClamped - 1); // 本部長: 1051-1100
        case 'accounting':
          return String(16051 + companyIdClamped - 1); // 経理: 16051-16100
        default:
          return String(21051 + companyIdClamped - 1); // デフォルト: 上長
      }
    };
    
    // 申請タイプに応じて承認者を決定
    let nextApproverId: string | undefined;
    let nextApproverName: string | undefined;
    let nextApproverDepartment: string | undefined;
    let currentStep = 1;
    let totalSteps = 1;
    
    switch (data.type) {
      case 'business-trip':
        // 出張申請: エンジニア申請 → 上長承認 → 本部長最終承認（3ステップ）
        nextApproverId = getApproverIdByRole('manager', companyId);
        const manager1 = await stubUserService.getUser(nextApproverId);
        nextApproverName = manager1.name;
        nextApproverDepartment = manager1.department;
        currentStep = 1;
        totalSteps = 3;
        break;
      case 'expense':
        // 経費申請: エンジニア申請 → 上長承認 → 経理承認（3ステップ）
        nextApproverId = getApproverIdByRole('manager', companyId);
        const manager2 = await stubUserService.getUser(nextApproverId);
        nextApproverName = manager2.name;
        nextApproverDepartment = manager2.department;
        currentStep = 1;
        totalSteps = 3;
        break;
      case 'vacation':
        // 休暇申請: エンジニア申請 → 上長承認（2ステップ）
        nextApproverId = getApproverIdByRole('manager', companyId);
        const manager3 = await stubUserService.getUser(nextApproverId);
        nextApproverName = manager3.name;
        nextApproverDepartment = manager3.department;
        currentStep = 1;
        totalSteps = 2;
        break;
      case 'promotion':
        // プロモーション申請: 上長申請 → 本部長承認（2ステップ）
        nextApproverId = getApproverIdByRole('director', companyId);
        const director = await stubUserService.getUser(nextApproverId);
        nextApproverName = director.name;
        nextApproverDepartment = director.department;
        currentStep = 1;
        totalSteps = 2;
        break;
      default:
        // デフォルト: 上長が承認（2ステップ）
        nextApproverId = getApproverIdByRole('manager', companyId);
        const manager4 = await stubUserService.getUser(nextApproverId);
        nextApproverName = manager4.name;
        nextApproverDepartment = manager4.department;
        currentStep = 1;
        totalSteps = 2;
        break;
    }
    
    const application: Application = {
      id: applicationId,
      ...data,
      status: 'pending',
      applicantId: data.applicantId,
      currentStep,
      totalSteps,
      nextApproverId,
      nextApproverName,
      nextApproverDepartment,
      createdAt: now,
      updatedAt: now,
    };
    
    // 申請を保存
    applications[applicationId] = application;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Stub Application Service] Created application:', {
        id: applicationId,
        type: data.type,
        nextApproverId,
        nextApproverName,
        currentStep,
        totalSteps,
      });
    }
    
    // 承認レコードを作成
    // 注意: currentStep=1は申請作成時、次の承認はstep=2から開始
    if (nextApproverId) {
      // 承認レコードを保存する配列を初期化
      if (!approvals[applicationId]) {
        approvals[applicationId] = [];
      }
      
      // 出張申請の場合: ステップ2（上長）とステップ3（本部長）の承認レコードを作成
      if (data.type === 'business-trip' && totalSteps === 3) {
        // ステップ2: 上長承認
        const managerId = getApproverIdByRole('manager', companyId);
        const manager = await stubUserService.getUser(managerId);
        const approval2Id = `${applicationId}-2`;
        const approval2: Approval = {
          id: approval2Id,
          applicationId: applicationId,
          approverId: managerId,
          approverName: manager.name,
          approverDepartment: manager.department,
          status: 'pending',
          step: 2,
          createdAt: now,
          updatedAt: now,
        };
        approvals[applicationId].push(approval2);
        
        // ステップ3: 本部長最終承認
        const directorId = getApproverIdByRole('director', companyId);
        const director = await stubUserService.getUser(directorId);
        const approval3Id = `${applicationId}-3`;
        const approval3: Approval = {
          id: approval3Id,
          applicationId: applicationId,
          approverId: directorId,
          approverName: director.name,
          approverDepartment: director.department,
          status: 'pending',
          step: 3,
          createdAt: now,
          updatedAt: now,
        };
        approvals[applicationId].push(approval3);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[Stub Application Service] Created approvals for business-trip:', {
            step2: approval2Id,
            step3: approval3Id,
            totalApprovals: approvals[applicationId].length,
          });
        }
      }
      // 経費申請の場合: ステップ2（上長）とステップ3（経理）の承認レコードを作成
      else if (data.type === 'expense' && totalSteps === 3) {
        // ステップ2: 上長承認
        const managerId = getApproverIdByRole('manager', companyId);
        const manager = await stubUserService.getUser(managerId);
        const approval2Id = `${applicationId}-2`;
        const approval2: Approval = {
          id: approval2Id,
          applicationId: applicationId,
          approverId: managerId,
          approverName: manager.name,
          approverDepartment: manager.department,
          status: 'pending',
          step: 2,
          createdAt: now,
          updatedAt: now,
        };
        approvals[applicationId].push(approval2);
        
        // ステップ3: 経理承認
        const accountingId = getApproverIdByRole('accounting', companyId);
        const accounting = await stubUserService.getUser(accountingId);
        const approval3Id = `${applicationId}-3`;
        const approval3: Approval = {
          id: approval3Id,
          applicationId: applicationId,
          approverId: accountingId,
          approverName: accounting.name,
          approverDepartment: accounting.department,
          status: 'pending',
          step: 3,
          createdAt: now,
          updatedAt: now,
        };
        approvals[applicationId].push(approval3);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[Stub Application Service] Created approvals for expense:', {
            step2: approval2Id,
            step3: approval3Id,
            totalApprovals: approvals[applicationId].length,
          });
        }
      }
      // 休暇申請の場合: ステップ2（上長）の承認レコードを作成
      else if (data.type === 'vacation' && totalSteps === 2) {
        const managerId = getApproverIdByRole('manager', companyId);
        const manager = await stubUserService.getUser(managerId);
        const approval2Id = `${applicationId}-2`;
        const approval2: Approval = {
          id: approval2Id,
          applicationId: applicationId,
          approverId: managerId,
          approverName: manager.name,
          approverDepartment: manager.department,
          status: 'pending',
          step: 2,
          createdAt: now,
          updatedAt: now,
        };
        approvals[applicationId].push(approval2);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[Stub Application Service] Created approval for vacation:', {
            step2: approval2Id,
            totalApprovals: approvals[applicationId].length,
          });
        }
      }
      // プロモーション申請の場合: ステップ2（本部長）の承認レコードを作成
      else if (data.type === 'promotion' && totalSteps === 2) {
        const directorId = getApproverIdByRole('director', companyId);
        const director = await stubUserService.getUser(directorId);
        const approval2Id = `${applicationId}-2`;
        const approval2: Approval = {
          id: approval2Id,
          applicationId: applicationId,
          approverId: directorId,
          approverName: director.name,
          approverDepartment: director.department,
          status: 'pending',
          step: 2,
          createdAt: now,
          updatedAt: now,
        };
        approvals[applicationId].push(approval2);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[Stub Application Service] Created approval for promotion:', {
            step2: approval2Id,
            totalApprovals: approvals[applicationId].length,
          });
        }
      }
      // デフォルト: ステップ2の承認レコードを作成
      else {
        const approval2Id = `${applicationId}-2`;
        const approval2: Approval = {
          id: approval2Id,
          applicationId: applicationId,
          approverId: nextApproverId,
          approverName: nextApproverName,
          approverDepartment: nextApproverDepartment,
          status: 'pending',
          step: 2,
          createdAt: now,
          updatedAt: now,
        };
        approvals[applicationId].push(approval2);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[Stub Application Service] Created approval:', {
            id: approval2Id,
            applicationId: applicationId,
            approverId: nextApproverId,
            step: 2,
            totalApprovals: approvals[applicationId].length,
          });
        }
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Stub Application Service] No nextApproverId specified, skipping approval creation');
      }
    }
    
    return application;
  },

  async updateApplicationStatus(id: string, status: 'pending' | 'approved' | 'rejected'): Promise<Application> {
    const application = applications[id];
    if (application) {
      application.status = status;
      application.updatedAt = new Date().toISOString();
      return application;
    }
    throw new Error(`Application with id ${id} not found`);
  },

  async updateApplication(id: string, updates: Partial<Application>): Promise<Application> {
    const application = applications[id];
    if (application) {
      Object.assign(application, updates);
      application.updatedAt = new Date().toISOString();
      return application;
    }
    throw new Error(`Application with id ${id} not found`);
  },
};

