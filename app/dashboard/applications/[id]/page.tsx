'use client';

import { useState, useEffect, use } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Divider,
} from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { apiClient } from '@/lib/api/client';
import type { Application, Approval } from '@/lib/api/types';
import { isManager, isDirector } from '@/lib/utils/auth';
import WorkflowProgress from '@/components/ui/WorkflowProgress';
import ReceiptCarousel from '@/components/ReceiptCarousel';
import ChapterDiagnosisDropdown from '@/components/ChapterDiagnosisDropdown';

const getStatusColor = (status: 'pending' | 'approved' | 'rejected') => {
  switch (status) {
    case 'approved':
      return 'success';
    case 'rejected':
      return 'error';
    case 'pending':
      return 'warning';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: 'pending' | 'approved' | 'rejected') => {
  switch (status) {
    case 'approved':
      return '承認済み';
    case 'rejected':
      return '却下';
    case 'pending':
      return '承認待ち';
    default:
      return status;
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'business-trip':
      return '出張申請';
    case 'expense':
      return '経費申請';
    case 'promotion':
      return 'プロモーション申請';
    default:
      return type;
  }
};

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ApplicationDetailPage({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = use(params);
  const [application, setApplication] = useState<Application | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 元のページを取得（クエリパラメータから）
  const fromPage = searchParams.get('from') || 'applications';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const [applicationData, approvalsData] = await Promise.all([
          apiClient.applications.getApplication(id),
          apiClient.approvals.getApprovalsByApplication(id).catch(() => []),
        ]);
        
        // プロモーション申請は、ワークフローの承認者ロール（上長=申請者・本部長=最終承認者）
        // のみ閲覧可能（対象の本人や無関係な部署には見せない）
        if (applicationData.type === 'promotion') {
          if (!isManager() && !isDirector()) {
            setError('プロモーション申請は上長・本部長のみ閲覧可能です');
            setLoading(false);
            return;
          }
        }
        
        setApplication(applicationData);
        setApprovals(approvalsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : '申請詳細の取得に失敗しました');
        console.error('申請詳細取得エラー:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const hasReceipts =
    application?.type === 'expense' &&
    !!application.receiptImageUrls &&
    application.receiptImageUrls.length > 0;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => {
            // 元のページに応じて戻る先を決定
            if (fromPage === 'approvals') {
              router.push('/dashboard/approvals');
            } else {
              router.push('/dashboard/applications');
            }
          }}
        >
          戻る
        </Button>
        <Typography variant="h4" component="h1" fontWeight="bold">
          申請詳細
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : application ? (
        <Grid container spacing={3}>
          <Grid item xs={12} md={hasReceipts ? 8 : 12}>
            <Paper sx={{ p: 4 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h5" component="h2" fontWeight="bold">
                      {application.title}
                    </Typography>
                    <Chip
                      label={getStatusLabel(application.status)}
                      color={getStatusColor(application.status) as any}
                      size="medium"
                    />
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Divider />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    申請タイプ
                  </Typography>
                  <Typography variant="body1">{getTypeLabel(application.type)}</Typography>
                </Grid>

                {application.type === 'expense' && application.amount !== undefined && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      金額
                    </Typography>
                    <Typography variant="body1" fontWeight="bold" color="primary">
                      ¥{application.amount.toLocaleString()}
                    </Typography>
                  </Grid>
                )}

                {application.type === 'business-trip' && application.startDate && application.endDate && (
                  <>
                    <Grid item xs={12} md={4}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        開始日
                      </Typography>
                      <Typography variant="body1">
                        {new Date(application.startDate).toLocaleDateString('ja-JP')}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        終了日
                      </Typography>
                      <Typography variant="body1">
                        {new Date(application.endDate).toLocaleDateString('ja-JP')}
                      </Typography>
                    </Grid>
                    {application.days !== undefined && (
                      <Grid item xs={12} md={4}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          日数
                        </Typography>
                        <Typography variant="body1" fontWeight="bold" color="primary">
                          {application.days}日
                        </Typography>
                      </Grid>
                    )}
                  </>
                )}

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    申請ID
                  </Typography>
                  <Typography variant="body1">{application.id}</Typography>
                </Grid>

                {/* 申請者情報 */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    申請者
                  </Typography>
                  <Box>
                    <Typography variant="body1" fontWeight="bold">
                      {application.applicantName || `ID: ${application.applicantId}`}
                    </Typography>
                    {application.applicantDepartment && (
                      <Typography variant="body2" color="text.secondary">
                        {application.applicantDepartment}
                      </Typography>
                    )}
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    説明
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {application.description}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    作成日時
                  </Typography>
                  <Typography variant="body1">{formatDate(application.createdAt)}</Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    更新日時
                  </Typography>
                  <Typography variant="body1">{formatDate(application.updatedAt)}</Typography>
                </Grid>

                {/* ワークフロー進捗表示 */}
                {(application.status === 'pending' || application.status === 'approved' || application.status === 'rejected') && (
                  <Grid item xs={12}>
                    <WorkflowProgress application={application} approvals={approvals} />
                  </Grid>
                )}

                {/* 承認履歴 */}
                {approvals.length > 0 && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ mt: 2, mb: 2 }} />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>
                        承認履歴
                      </Typography>
                    </Grid>
                    {approvals.map((approval, index) => (
                      <Grid item xs={12} key={approval.id}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                ステップ {approval.step || index + 1}
                              </Typography>
                              <Typography variant="body1" fontWeight="bold">
                                {approval.approverName || `承認者ID: ${approval.approverId}`}
                              </Typography>
                              {approval.approverDepartment && (
                                <Typography variant="body2" color="text.secondary">
                                  {approval.approverDepartment}
                                </Typography>
                              )}
                            </Box>
                            <Chip
                              label={getStatusLabel(approval.status)}
                              color={getStatusColor(approval.status) as any}
                              size="small"
                            />
                          </Box>
                          {approval.comment && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              コメント: {approval.comment}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            {formatDate(approval.createdAt)}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </>
                )}
              </Grid>
            </Paper>
          </Grid>

          {hasReceipts && (
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, position: 'sticky', top: 16 }}>
                <Typography variant="h6" gutterBottom>
                  レシート画像（{application.receiptImageUrls!.length}枚）
                </Typography>
                <ReceiptCarousel images={application.receiptImageUrls!} />
              </Paper>
              <Box sx={{ mt: 3 }}>
                <ChapterDiagnosisDropdown chapter={4} title="この画面の表示が遅い原因を診断する" />
              </Box>
            </Grid>
          )}
        </Grid>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Typography variant="body1" color="text.secondary" align="center">
            申請が見つかりませんでした
          </Typography>
        </Paper>
      )}
    </Container>
  );
}

