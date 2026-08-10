'use client';

import { Box, Typography, Chip, Paper } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import PendingIcon from '@mui/icons-material/Pending';
import CancelIcon from '@mui/icons-material/Cancel';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import type { Application, Approval } from '@/lib/api/types';

interface WorkflowProgressProps {
  application: Application;
  approvals: Approval[];
}

type StepStatus = 'completed' | 'current' | 'pending' | 'rejected';

interface StepInfo {
  stepNumber: number;
  status: StepStatus;
  approverName?: string;
  approverDepartment?: string;
  approverId?: string;
  comment?: string;
  completedAt?: string;
}

export default function WorkflowProgress({ application, approvals }: WorkflowProgressProps) {
  // 申請が却下されている場合は、すべてのステップを却下状態にする
  const isRejected = application.status === 'rejected';
  
  // 申請が承認されている場合は、すべてのステップを完了状態にする
  const isApproved = application.status === 'approved';
  
  // 総ステップ数
  const totalSteps = application.totalSteps || 1;
  
  // 現在のステップ（承認待ちのステップ）
  const currentStep = application.currentStep;
  
  // 承認履歴から各ステップの情報を構築
  const stepMap = new Map<number, Approval>();
  approvals.forEach((approval) => {
    if (approval.step) {
      stepMap.set(approval.step, approval);
    }
  });
  
  // 各ステップの情報を生成
  const steps: StepInfo[] = [];
  for (let i = 1; i <= totalSteps; i++) {
    const approval = stepMap.get(i);
    let status: StepStatus;
    
    if (isRejected) {
      // 却下されている場合
      if (approval?.status === 'rejected') {
        status = 'rejected';
      } else if (approval?.status === 'approved') {
        status = 'completed';
      } else {
        status = 'pending';
      }
    } else if (isApproved) {
      // 承認されている場合、すべて完了
      status = 'completed';
    } else if (approval?.status === 'approved') {
      // 承認済み
      status = 'completed';
    } else if (approval?.status === 'rejected') {
      // 却下
      status = 'rejected';
    } else if (currentStep !== undefined && i === currentStep) {
      // 現在のステップ（承認待ち）
      status = 'current';
    } else if (currentStep !== undefined && i < currentStep) {
      // 過去のステップ（完了しているはず）
      status = 'completed';
    } else {
      // 未開始
      status = 'pending';
    }
    
    steps.push({
      stepNumber: i,
      status,
      approverName: approval?.approverName,
      approverDepartment: approval?.approverDepartment,
      approverId: approval?.approverId,
      comment: approval?.comment,
      completedAt: approval?.updatedAt,
    });
  }
  
  const getStepIcon = (status: StepStatus) => {
    const iconStyle = { fontSize: 32 };
    switch (status) {
      case 'completed':
        return <CheckCircleIcon sx={{ ...iconStyle, color: '#4caf50' }} />;
      case 'current':
        return <PendingIcon sx={{ ...iconStyle, color: '#81c784' }} />;
      case 'rejected':
        return <CancelIcon sx={{ ...iconStyle, color: '#f44336' }} />;
      case 'pending':
        return <RadioButtonUncheckedIcon sx={{ ...iconStyle, color: '#e0e0e0' }} />;
    }
  };
  
  const getStepLabel = (step: StepInfo) => {
    const roleMap: Record<string, string> = {
      'manager': '上長',
      'director': '本部長',
      'accounting': '経理',
      'engineer': 'エンジニア',
    };
    
    // 承認者名からロールを推測（簡易実装）
    let roleLabel = step.approverName || '承認者';
    if (step.approverName) {
      // 承認者名がロール名の場合
      Object.entries(roleMap).forEach(([key, value]) => {
        if (step.approverName === value) {
          roleLabel = value;
        }
      });
    }
    
    return roleLabel;
  };
  
  const getStepBgColor = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return '#4caf50'; // 緑
      case 'current':
        return '#81c784'; // 薄い緑
      case 'rejected':
        return '#f44336'; // 赤
      case 'pending':
        return '#e0e0e0'; // グレー
    }
  };
  
  const getConnectorColor = (fromStatus: StepStatus, toStatus: StepStatus) => {
    // 完了から次のステップへの矢印は緑
    if (fromStatus === 'completed') {
      return '#4caf50';
    }
    // 現在のステップから次のステップへの矢印は薄い緑
    if (fromStatus === 'current') {
      return '#81c784';
    }
    // 却下の場合は赤
    if (fromStatus === 'rejected' || toStatus === 'rejected') {
      return '#f44336';
    }
    // その他はグレー
    return '#e0e0e0';
  };
  
  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        承認フロー進捗
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 1 }}>
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const connectorColor = !isLast ? getConnectorColor(step.status, steps[index + 1]?.status || 'pending') : 'transparent';
          
          return (
            <Box key={step.stepNumber} sx={{ display: 'flex', alignItems: 'center' }}>
              {/* ステップ */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: 120,
                  position: 'relative',
                }}
              >
                {/* アイコン */}
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    bgcolor: getStepBgColor(step.status),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    mb: 1,
                    boxShadow: step.status === 'current' ? '0 0 0 4px rgba(129, 199, 132, 0.3)' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {getStepIcon(step.status)}
                </Box>
                
                {/* ステップ番号とラベル */}
                <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  ステップ {step.stepNumber}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', textAlign: 'center', mb: 0.5 }}>
                  {getStepLabel(step)}
                </Typography>
                
                {/* 承認者名 */}
                {step.status === 'current' && application.nextApproverName && (
                  <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 'bold', textAlign: 'center' }}>
                    {application.nextApproverName}
                  </Typography>
                )}
                {step.status === 'completed' && step.approverName && (
                  <Typography variant="caption" sx={{ color: '#4caf50', textAlign: 'center' }}>
                    {step.approverName}
                  </Typography>
                )}
                
                {/* ステータスチップ */}
                <Chip
                  label={
                    step.status === 'completed' ? '承認済み' :
                    step.status === 'current' ? '承認待ち' :
                    step.status === 'rejected' ? '却下' : '未開始'
                  }
                  size="small"
                  sx={{
                    mt: 0.5,
                    bgcolor: step.status === 'completed' ? '#4caf50' :
                             step.status === 'current' ? '#81c784' :
                             step.status === 'rejected' ? '#f44336' : '#e0e0e0',
                    color: step.status === 'pending' ? '#757575' : 'white',
                    fontWeight: 'bold',
                    fontSize: '0.7rem',
                  }}
                />
              </Box>
              
              {/* 矢印（最後のステップ以外） */}
              {!isLast && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mx: 1,
                    minWidth: 40,
                  }}
                >
                  <ArrowForwardIcon
                    sx={{
                      fontSize: 32,
                      color: connectorColor,
                      transition: 'color 0.3s ease',
                    }}
                  />
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
      
      {/* ステータスメッセージ */}
      {application.status === 'pending' && currentStep !== undefined && (
        <Box sx={{ mt: 3, p: 2, bgcolor: '#e8f5e9', borderRadius: 1, border: '1px solid #4caf50' }}>
          <Typography variant="body2" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
            現在の状況: ステップ {currentStep} / {totalSteps} の承認待ちです
            {application.nextApproverName && ` (承認者: ${application.nextApproverName})`}
          </Typography>
        </Box>
      )}
      {application.status === 'approved' && (
        <Box sx={{ mt: 3, p: 2, bgcolor: '#e8f5e9', borderRadius: 1, border: '1px solid #4caf50' }}>
          <Typography variant="body2" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
            ✓ すべての承認が完了しました。申請は承認されました。
          </Typography>
        </Box>
      )}
      {application.status === 'rejected' && (
        <Box sx={{ mt: 3, p: 2, bgcolor: '#ffebee', borderRadius: 1, border: '1px solid #f44336' }}>
          <Typography variant="body2" sx={{ color: '#c62828', fontWeight: 'bold' }}>
            ✗ 申請は却下されました。
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

