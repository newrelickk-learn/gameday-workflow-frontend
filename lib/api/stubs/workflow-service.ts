import type {
  Approval,
  UpdateApprovalRequest,
  Application,
  StartWorkflowRequest,
  StartWorkflowResponse,
  ValidateApprovalRequest,
  ValidateApprovalResponse,
  ApproveWorkflowRequest,
  ApproveWorkflowResponse,
  Notification,
  SendNotificationRequest,
  SendNotificationResponse,
} from '../types';
import { stubApplicationService } from './application-service';

// 承認データ（application-service.tsからもアクセス可能にするためエクスポート）
export const approvals: Record<string, Approval[]> = {
  '1': [
    {
      id: '1-1',
      applicationId: '1',
      approverId: '21051',
      approverName: '上長',
      approverDepartment: '開発組織',
      status: 'pending',
      step: 1,
      createdAt: '2024-04-01T00:00:00Z',
      updatedAt: '2024-04-01T00:00:00Z',
    },
  ],
  '2': [
    {
      id: '2-1',
      applicationId: '2',
      approverId: '21051',
      approverName: '上長',
      approverDepartment: '開発組織',
      status: 'pending',
      step: 1,
      createdAt: '2024-04-18T00:00:00Z',
      updatedAt: '2024-04-18T00:00:00Z',
    },
    {
      id: '2-2',
      applicationId: '2',
      approverId: '16051',
      approverName: '経理',
      approverDepartment: '管理組織',
      status: 'pending',
      step: 2,
      createdAt: '2024-04-18T00:00:00Z',
      updatedAt: '2024-04-18T00:00:00Z',
    },
  ],
  '3': [
    {
      id: '3-1',
      applicationId: '3',
      approverId: '1051',
      approverName: '本部長',
      approverDepartment: '開発組織',
      status: 'pending',
      step: 1,
      createdAt: '2024-04-20T00:00:00Z',
      updatedAt: '2024-04-20T00:00:00Z',
    },
  ],
};

// ワークフローインスタンスの状態管理
interface WorkflowInstance {
  workflowInstanceId: string;
  applicationId: string;
  currentStep: number;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  applicationType: 'BusinessTrip' | 'Expense' | 'Vacation' | 'Promotion';
  totalSteps: number;
}

const workflowInstances: Record<string, WorkflowInstance> = {};

// 通知データ
const notifications: Notification[] = [];

// 申請タイプ別のステップ数と承認者IDのマッピング（CompanyId=1の場合）
function getWorkflowConfig(applicationType: StartWorkflowRequest['applicationType'], companyId: number = 1) {
  const configs: Record<string, { totalSteps: number; approvers: string[] }> = {
    BusinessTrip: {
      totalSteps: 3,
      approvers: ['20001', '21051', '1051'], // エンジニア、上長、本部長
    },
    Expense: {
      totalSteps: 3,
      approvers: ['20001', '21051', '16051'], // エンジニア、上長、経理
    },
    Vacation: {
      totalSteps: 2,
      approvers: ['20001', '21051'], // エンジニア、上長
    },
    Promotion: {
      totalSteps: 2,
      approvers: ['21051', '1051'], // 上長、本部長
    },
  };
  return configs[applicationType] || { totalSteps: 1, approvers: ['20001'] };
}

export const stubWorkflowService = {
  async createApproval(data: {
    applicationId: string;
    approverId: string;
    approverName?: string;
    approverDepartment?: string;
    step?: number;
  }): Promise<Approval> {
    const approvalId = `${data.applicationId}-${data.step || 1}`;
    const now = new Date().toISOString();
    
    const approval: Approval = {
      id: approvalId,
      applicationId: data.applicationId,
      approverId: data.approverId,
      approverName: data.approverName,
      approverDepartment: data.approverDepartment,
      status: 'pending',
      step: data.step || 1,
      createdAt: now,
      updatedAt: now,
    };
    
    // 承認レコードを保存
    if (!approvals[data.applicationId]) {
      approvals[data.applicationId] = [];
    }
    approvals[data.applicationId].push(approval);
    
    return approval;
  },

  async getApprovals(recipientId?: string): Promise<Approval[]> {
    // 承認待ちの承認のみを返す
    let result = Object.values(approvals)
      .flat()
      .filter((approval) => approval.status === 'pending');
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Stub Workflow Service] getApprovals called:', {
        recipientId,
        totalPendingApprovals: result.length,
        allApprovals: result.map(a => ({
          id: a.id,
          applicationId: a.applicationId,
          approverId: a.approverId,
          approverName: a.approverName,
          status: a.status,
          step: a.step,
        })),
      });
    }
    
    // recipientIdが指定されている場合、そのユーザーが承認者である承認のみを返す
    if (recipientId) {
      const beforeFilter = result.length;
      result = result.filter((approval) => approval.approverId === recipientId);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[Stub Workflow Service] Filtered by recipientId:', {
          recipientId,
          beforeFilter,
          afterFilter: result.length,
          filteredApprovals: result.map(a => ({
            id: a.id,
            applicationId: a.applicationId,
            approverId: a.approverId,
            approverName: a.approverName,
            status: a.status,
            step: a.step,
          })),
        });
      }
    }
    
    return result;
  },
  
  async getApprovalsByApplication(applicationId: string): Promise<Approval[]> {
    return approvals[applicationId] || [];
  },

  async getApproval(id: string): Promise<Approval> {
    // 全ての承認から該当するIDを探す
    const allApprovals = Object.values(approvals).flat();
    const approval = allApprovals.find(a => a.id === id);
    if (approval) {
      return approval;
    }
    // 見つからない場合はデフォルト値を返す
    return {
      id,
      applicationId: '1',
      approverId: '21051',
      status: 'pending',
      createdAt: '2024-03-01T00:00:00Z',
      updatedAt: '2024-03-01T00:00:00Z',
    };
  },

  async updateApproval(id: string, data: UpdateApprovalRequest): Promise<Approval> {
    // 全ての承認から該当するIDを探して更新
    const allApprovals = Object.values(approvals).flat();
    const approval = allApprovals.find(a => a.id === id);
    
    if (!approval) {
      // 見つからない場合は新しい承認を作成
      return {
        id,
        applicationId: data.applicationId || '1',
        approverId: data.approverId,
        status: data.status,
        comment: data.comment,
        createdAt: '2024-03-01T00:00:00Z',
        updatedAt: new Date().toISOString(),
      };
    }

    // 承認を更新
    approval.status = data.status;
    approval.comment = data.comment;
    approval.updatedAt = new Date().toISOString();

    // 申請のステータスを更新
    const applicationId = approval.applicationId;
    try {
      const application = await stubApplicationService.getApplication(applicationId);
      const applicationApprovals = approvals[applicationId] || [];
      
      // 承認が却下された場合、申請も却下
      if (data.status === 'rejected') {
        await stubApplicationService.updateApplicationStatus(applicationId, 'rejected');
      } else if (data.status === 'approved') {
        // 承認が承認された場合、現在のステップを更新
        const currentStep = approval.step || 1;
        const nextStep = currentStep + 1;
        const totalSteps = application.totalSteps || 1;
        
        // 次のステップの承認レコードを取得
        const nextApproval = applicationApprovals.find(a => a.step === nextStep);
        
        // 申請のcurrentStepとnextApproverIdを更新
        // 最終ステップの承認が完了した場合、currentStepをtotalStepsに設定
        const finalStep = nextStep > totalSteps ? totalSteps : nextStep;
        const updates: Partial<Application> = {
          currentStep: finalStep,
        };
        
        if (nextApproval && nextStep <= totalSteps) {
          updates.nextApproverId = nextApproval.approverId;
          updates.nextApproverName = nextApproval.approverName;
          updates.nextApproverDepartment = nextApproval.approverDepartment;
        } else {
          // 次のステップがない場合、nextApproverIdをクリア
          updates.nextApproverId = undefined;
          updates.nextApproverName = undefined;
          updates.nextApproverDepartment = undefined;
        }
        
        await stubApplicationService.updateApplication(applicationId, updates);
        
        // すべての承認が完了したか確認
        const allApproved = applicationApprovals.every(a => a.status === 'approved');
        const anyRejected = applicationApprovals.some(a => a.status === 'rejected');
        
        if (anyRejected) {
          // いずれかの承認が却下されている場合、申請も却下
          await stubApplicationService.updateApplicationStatus(applicationId, 'rejected');
        } else if (allApproved) {
          // すべての承認が完了した場合、申請も承認
          await stubApplicationService.updateApplicationStatus(applicationId, 'approved');
        }
        // それ以外の場合はpendingのまま（更新不要）
      }
    } catch (error) {
      console.error('[Stub Workflow Service] Failed to update application status:', error);
    }

    return approval;
  },

  // 新しいワークフローAPI
  async startWorkflow(data: StartWorkflowRequest): Promise<StartWorkflowResponse> {
    const workflowInstanceId = `wf-${data.applicationId}-${Date.now()}`;
    const config = getWorkflowConfig(data.applicationType, data.companyId || 1);
    
    // ワークフローインスタンスを作成
    const instance: WorkflowInstance = {
      workflowInstanceId,
      applicationId: data.applicationId,
      currentStep: 1,
      status: 'pending',
      applicationType: data.applicationType,
      totalSteps: config.totalSteps,
    };
    workflowInstances[data.applicationId] = instance;
    
    // ステップ1の承認レコードを作成（申請者自身が承認する場合）
    if (config.approvers.length > 0) {
      const firstApproverId = config.approvers[0];
      await this.createApproval({
        applicationId: data.applicationId,
        approverId: firstApproverId,
        approverName: firstApproverId === '20001' ? 'エンジニア' : '上長',
        approverDepartment: '開発組織',
        step: 1,
      });
      
      // ステップ2以降の承認者に通知を送信
      if (config.approvers.length > 1) {
        for (let i = 1; i < config.approvers.length; i++) {
          const approverId = config.approvers[i];
          const step = i + 1;
          await this.createApproval({
            applicationId: data.applicationId,
            approverId,
            approverName: approverId === '21051' ? '上長' : approverId === '1051' ? '本部長' : approverId === '16051' ? '経理' : '承認者',
            approverDepartment: approverId === '16051' ? '管理組織' : '開発組織',
            step,
          });
          
          // 通知を送信
          notifications.push({
            id: `notif-${data.applicationId}-${step}-${Date.now()}`,
            notificationType: 'ApprovalRequest',
            channel: 'Email',
            recipientId: approverId,
            recipientEmail: `${approverId}@example.com`,
            subject: `承認依頼: 申請ID ${data.applicationId}`,
            body: `申請ID: ${data.applicationId} のステップ ${step} の承認をお願いします`,
            sentAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
    
    return {
      workflowInstanceId,
      applicationId: data.applicationId,
      currentStep: 1,
      status: 'pending',
    };
  },

  async validateApproval(data: ValidateApprovalRequest): Promise<ValidateApprovalResponse> {
    const instance = workflowInstances[data.applicationId];
    if (!instance) {
      return {
        valid: false,
        currentStep: 0,
        isFinalStep: false,
        message: 'ワークフローインスタンスが見つかりません',
      };
    }
    
    // 承認レコードを取得
    const approval = approvals[data.applicationId]?.find(a => a.id === data.approvalId);
    if (!approval) {
      return {
        valid: false,
        currentStep: instance.currentStep,
        isFinalStep: instance.currentStep >= instance.totalSteps,
        message: '承認レコードが見つかりません',
      };
    }
    
    // 現在のステップと一致しているか確認
    const isValid = approval.step === instance.currentStep && approval.approverId === data.approverId;
    const isFinalStep = instance.currentStep >= instance.totalSteps;
    const nextStep = isFinalStep ? null : instance.currentStep + 1;
    
    return {
      valid: isValid,
      currentStep: instance.currentStep,
      isFinalStep,
      nextStep: nextStep || undefined,
      message: isValid ? '承認可能です' : '承認できません。現在のステップと一致していません',
    };
  },

  async approveWorkflow(data: ApproveWorkflowRequest): Promise<ApproveWorkflowResponse> {
    const instance = workflowInstances[data.applicationId];
    if (!instance) {
      throw new Error('ワークフローインスタンスが見つかりません');
    }
    
    // 承認レコードを取得して更新
    const approval = approvals[data.applicationId]?.find(a => a.id === data.approvalId);
    if (!approval) {
      throw new Error('承認レコードが見つかりません');
    }
    
    // 承認を更新
    approval.status = data.status;
    approval.updatedAt = new Date().toISOString();
    
    if (data.status === 'rejected') {
      // 拒否された場合
      instance.status = 'rejected';
      return {
        applicationId: data.applicationId,
        currentStep: instance.currentStep,
        status: 'rejected',
        message: '承認が拒否されました',
      };
    }
    
    // 承認された場合、次のステップに進む
    const isFinalStep = instance.currentStep >= instance.totalSteps;
    if (isFinalStep) {
      instance.status = 'completed';
      // ワークフローが完了した場合、applicationのステータスをapprovedに更新
      try {
        await stubApplicationService.updateApplicationStatus(data.applicationId, 'approved');
      } catch (error) {
        console.error('[Stub Workflow Service] Failed to update application status:', error);
      }
      return {
        applicationId: data.applicationId,
        currentStep: instance.currentStep,
        status: 'completed',
        message: 'すべての承認が完了しました',
      };
    }
    
    // 次のステップに進む
    instance.currentStep += 1;
    instance.status = 'in_progress';
    
    // 次のステップの承認者に通知を送信
    const nextApproval = approvals[data.applicationId]?.find(a => a.step === instance.currentStep);
    if (nextApproval) {
      notifications.push({
        id: `notif-${data.applicationId}-${instance.currentStep}-${Date.now()}`,
        notificationType: 'ApprovalRequest',
        channel: 'Email',
        recipientId: nextApproval.approverId,
        recipientEmail: `${nextApproval.approverId}@example.com`,
        subject: `承認依頼: 申請ID ${data.applicationId}`,
        body: `申請ID: ${data.applicationId} のステップ ${instance.currentStep} の承認をお願いします`,
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }
    
    return {
      applicationId: data.applicationId,
      currentStep: instance.currentStep,
      status: 'in_progress',
      message: `ステップ${instance.currentStep - 1}の承認が完了しました。次のステップに進みます。`,
    };
  },

  async getNotificationHistory(recipientId: string): Promise<Notification[]> {
    return notifications.filter(n => n.recipientId === recipientId);
  },

  async sendNotification(data: SendNotificationRequest): Promise<SendNotificationResponse> {
    const notification: Notification = {
      id: `notif-${Date.now()}`,
      notificationType: data.notificationType,
      channel: 'Email',
      recipientId: data.recipientId,
      recipientEmail: `${data.recipientId}@example.com`,
      subject: data.subject,
      body: data.body,
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    
    notifications.push(notification);
    
    return {
      success: true,
      message: '通知を送信しました',
    };
  },
};

