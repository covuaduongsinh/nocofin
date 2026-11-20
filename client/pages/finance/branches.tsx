import { useApiClient, useSubmission, useToaster } from '@nocobase/app-client';
import { useTranslation } from '@nocobase/i18n/client';
import {
  Building2,
  Plus,
  Edit2,
  RefreshCw,
  School,
  Briefcase,
  Layers,
} from 'lucide-react';
import { useCallback, useEffect, useState, type ReactElement } from 'react';

import { Loading } from '#components/loading';
import { PageContainer } from '#components/page-container';
import { PageHeader } from '#components/page-header';
import { Button } from '#components/ui/button';
import { Badge } from '#components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#components/ui/dialog';
import { Input } from '#components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#components/ui/select';
import { Switch } from '#components/ui/switch';
import { Textarea } from '#components/ui/textarea';

import type { FinanceBranch } from './types.js';

export default function FinanceBranchesPage(): ReactElement {
  const { t } = useTranslation();
  const api = useApiClient();
  const toaster = useToaster();

  const [loading, setLoading] = useState<boolean>(true);
  const [branches, setBranches] = useState<FinanceBranch[]>([]);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingBranch, setEditingBranch] = useState<FinanceBranch | null>(null);
  const [formCode, setFormCode] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formKind, setFormKind] = useState<'club' | 'school' | 'office'>('club');
  const [formNote, setFormNote] = useState<string>('');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  const submission = useSubmission({ scope: 'finance-branch-mutation' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.request<{ data: FinanceBranch[] }>({
        path: 'finance/branches',
      });
      setBranches(res.data);
    } catch (err: unknown) {
      toaster.show({
        type: 'error',
        title: 'Không thể tải danh sách cơ sở',
      });
    } finally {
      setLoading(false);
    }
  }, [api, toaster]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openCreateDialog = () => {
    setEditingBranch(null);
    setFormCode('');
    setFormName('');
    setFormKind('club');
    setFormNote('');
    setFormIsActive(true);
    setDialogOpen(true);
  };

  const openEditDialog = (branch: FinanceBranch) => {
    setEditingBranch(branch);
    setFormCode(branch.code);
    setFormName(branch.name);
    setFormKind(branch.kind);
    setFormNote(branch.note ?? '');
    setFormIsActive(branch.isActive);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formCode.trim()) {
      toaster.show({ type: 'error', title: 'Vui lòng nhập mã cơ sở' });
      return;
    }
    if (!formName.trim()) {
      toaster.show({ type: 'error', title: 'Vui lòng nhập tên cơ sở' });
      return;
    }

    try {
      const outcome = await submission.run(
        { action: editingBranch ? 'update-branch' : 'create-branch' },
        async (key) => {
          if (editingBranch) {
            return api.request({
              path: `finance/branches/${encodeURIComponent(editingBranch.id)}`,
              method: 'PATCH',
              json: {
                name: formName.trim(),
                kind: formKind,
                note: formNote.trim() || null,
                isActive: formIsActive,
              },
              headers: { 'Idempotency-Key': key },
            });
          }

          return api.request({
            path: 'finance/branches',
            method: 'POST',
            json: {
              code: formCode.trim().toUpperCase(),
              name: formName.trim(),
              kind: formKind,
              note: formNote.trim() || null,
              isActive: formIsActive,
            },
            headers: { 'Idempotency-Key': key },
          });
        },
      );

      if (outcome) {
        toaster.show({
          type: 'success',
          title: editingBranch ? 'Cập nhật cơ sở thành công' : 'Thêm cơ sở thành công',
        });
        setDialogOpen(false);
        void loadData();
      }
    } catch (err: unknown) {
      toaster.show({
        type: 'error',
        title: 'Lỗi khi lưu cơ sở',
      });
    }
  };

  return (
    <PageContainer className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <PageHeader
          title={t('finance.branches.title')}
          description={t('finance.branches.subtitle')}
        />
        <div className='flex items-center gap-2'>
          <Button
            variant='default'
            onClick={openCreateDialog}
            className='bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5'
          >
            <Plus className='size-4' />
            {t('finance.branches.addBranch')}
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => void loadData()}
            disabled={loading}
            className='gap-1.5'
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Branches Table */}
      <div className='rounded-xl border bg-card shadow-xs overflow-hidden'>
        {loading && branches.length === 0 ? (
          <div className='p-8'>
            <Loading />
          </div>
        ) : branches.length === 0 ? (
          <div className='py-12 text-center text-muted-foreground'>
            Chưa có cơ sở nào được tạo
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className='bg-muted/50'>
                <TableHead className='w-28'>{t('finance.branches.code')}</TableHead>
                <TableHead>{t('finance.branches.name')}</TableHead>
                <TableHead>{t('finance.branches.kind')}</TableHead>
                <TableHead>{t('finance.branches.note')}</TableHead>
                <TableHead className='text-center w-28'>{t('finance.branches.status')}</TableHead>
                <TableHead className='text-right w-20'>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((b) => (
                <TableRow key={b.id} className='hover:bg-muted/30'>
                  <TableCell className='font-mono text-xs font-semibold'>
                    <Badge variant='outline'>{b.code}</Badge>
                  </TableCell>
                  <TableCell className='font-medium'>
                    <div className='flex items-center gap-2'>
                      {b.kind === 'school' ? (
                        <School className='size-4 text-amber-600' />
                      ) : b.kind === 'office' ? (
                        <Briefcase className='size-4 text-purple-600' />
                      ) : (
                        <Building2 className='size-4 text-primary' />
                      )}
                      <span>{b.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className='text-xs'>
                    {b.kind === 'club'
                      ? t('finance.branches.club')
                      : b.kind === 'school'
                      ? t('finance.branches.school')
                      : t('finance.branches.office')}
                  </TableCell>
                  <TableCell className='text-xs text-muted-foreground'>
                    {b.note || '-'}
                  </TableCell>
                  <TableCell className='text-center'>
                    <Badge
                      variant={b.isActive ? 'outline' : 'secondary'}
                      className={
                        b.isActive
                          ? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:bg-emerald-950/40'
                          : 'text-muted-foreground'
                      }
                    >
                      {b.isActive ? t('finance.branches.active') : t('finance.branches.inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-right'>
                    <Button
                      variant='ghost'
                      size='icon-sm'
                      onClick={() => openEditDialog(b)}
                      title='Chỉnh sửa'
                    >
                      <Edit2 className='size-3.5 text-muted-foreground hover:text-foreground' />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add / Edit Branch Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>
              {editingBranch
                ? t('finance.branches.editBranch')
                : t('finance.branches.addBranch')}
            </DialogTitle>
            <DialogDescription>
              Thiết lập thông tin cơ sở hoặc địa điểm đào tạo cờ vua
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 py-2'>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='text-xs font-medium text-muted-foreground'>
                  {t('finance.branches.code')} *
                </label>
                <Input
                  placeholder='CS-03'
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  disabled={Boolean(editingBranch)}
                  className='mt-1 uppercase font-mono text-sm'
                />
              </div>
              <div>
                <label className='text-xs font-medium text-muted-foreground'>
                  {t('finance.branches.kind')} *
                </label>
                <Select
                  value={formKind}
                  onValueChange={(val) => {
                    if (val === 'club' || val === 'school' || val === 'office') {
                      setFormKind(val);
                    }
                  }}
                >
                  <SelectTrigger className='mt-1 w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='club'>{t('finance.branches.club')}</SelectItem>
                    <SelectItem value='school'>{t('finance.branches.school')}</SelectItem>
                    <SelectItem value='office'>{t('finance.branches.office')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className='text-xs font-medium text-muted-foreground'>
                {t('finance.branches.name')} *
              </label>
              <Input
                placeholder='Cơ sở 1 - Số 123 Thái Hà, Đống Đa'
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className='mt-1'
              />
            </div>

            <div>
              <label className='text-xs font-medium text-muted-foreground'>
                {t('finance.branches.note')}
              </label>
              <Textarea
                placeholder='Địa chỉ cụ thể, liên hệ cơ sở...'
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                rows={2}
                className='mt-1'
              />
            </div>

            <div className='flex items-center justify-between rounded-lg border p-3'>
              <div>
                <div className='text-sm font-medium'>Kích hoạt hoạt động</div>
                <div className='text-xs text-muted-foreground'>
                  Cơ sở đang mở lớp và phát sinh giao dịch thu chi
                </div>
              </div>
              <Switch
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
            </div>
          </div>

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type='button'
              disabled={submission.submitting}
              onClick={() => void handleSave()}
            >
              {submission.submitting ? 'Đang lưu...' : t('finance.branches.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
