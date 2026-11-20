import { useApiClient, useSubmission, useToaster } from '@nocobase/app-client';
import { useTranslation } from '@nocobase/i18n/client';
import {
  Tag,
  Plus,
  Edit2,
  RefreshCw,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#components/ui/tabs';

import type { FinanceCategory, TransactionType } from '../finance/types.js';

export default function FinanceCategoriesSettingsPage(): ReactElement {
  const { t } = useTranslation();
  const api = useApiClient();
  const toaster = useToaster();

  const [loading, setLoading] = useState<boolean>(true);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [activeTab, setActiveTab] = useState<TransactionType>('income');

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<FinanceCategory | null>(null);
  const [formCode, setFormCode] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formType, setFormType] = useState<TransactionType>('income');
  const [formSortOrder, setFormSortOrder] = useState<string>('0');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  const submission = useSubmission({ scope: 'finance-category-mutation' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.request<{ data: FinanceCategory[] }>({
        path: 'finance/categories',
      });
      setCategories(res.data);
    } catch (err: unknown) {
      toaster.show({
        type: 'error',
        title: 'Không thể tải danh mục thu chi',
      });
    } finally {
      setLoading(false);
    }
  }, [api, toaster]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredCategories = categories.filter((c) => c.type === activeTab);

  const openCreateDialog = () => {
    setEditingCategory(null);
    setFormCode('');
    setFormName('');
    setFormType(activeTab);
    setFormSortOrder(String(filteredCategories.length * 10 + 10));
    setFormIsActive(true);
    setDialogOpen(true);
  };

  const openEditDialog = (cat: FinanceCategory) => {
    setEditingCategory(cat);
    setFormCode(cat.code);
    setFormName(cat.name);
    setFormType(cat.type);
    setFormSortOrder(String(cat.sortOrder));
    setFormIsActive(cat.isActive);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formCode.trim()) {
      toaster.show({ type: 'error', title: 'Vui lòng nhập mã danh mục' });
      return;
    }
    if (!formName.trim()) {
      toaster.show({ type: 'error', title: 'Vui lòng nhập tên danh mục' });
      return;
    }

    const sortNum = Number(formSortOrder) || 0;

    try {
      const outcome = await submission.run(
        { action: editingCategory ? 'update-category' : 'create-category' },
        async (key) => {
          if (editingCategory) {
            return api.request({
              path: `finance/categories/${encodeURIComponent(editingCategory.id)}`,
              method: 'PATCH',
              json: {
                name: formName.trim(),
                sortOrder: sortNum,
                isActive: formIsActive,
              },
              headers: { 'Idempotency-Key': key },
            });
          }

          return api.request({
            path: 'finance/categories',
            method: 'POST',
            json: {
              code: formCode.trim().toUpperCase(),
              name: formName.trim(),
              type: formType,
              sortOrder: sortNum,
              isActive: formIsActive,
            },
            headers: { 'Idempotency-Key': key },
          });
        },
      );

      if (outcome) {
        toaster.show({
          type: 'success',
          title: editingCategory
            ? 'Cập nhật danh mục thành công'
            : 'Thêm danh mục mới thành công',
        });
        setDialogOpen(false);
        void loadData();
      }
    } catch (err: unknown) {
      toaster.show({
        type: 'error',
        title: 'Lỗi khi lưu danh mục thu chi',
      });
    }
  };

  return (
    <PageContainer className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <PageHeader
          title={t('finance.categories.title')}
          description={t('finance.categories.subtitle')}
        />
        <div className='flex items-center gap-2'>
          <Button
            variant='default'
            onClick={openCreateDialog}
            className='bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5'
          >
            <Plus className='size-4' />
            {t('finance.categories.addCategory')}
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

      {/* Tabs for Income / Expense */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          if (val === 'income' || val === 'expense') setActiveTab(val);
        }}
      >
        <TabsList className='grid w-72 grid-cols-2'>
          <TabsTrigger value='income' className='gap-2'>
            <span className='size-2 rounded-full bg-emerald-500' />
            {t('finance.categories.income')}
          </TabsTrigger>
          <TabsTrigger value='expense' className='gap-2'>
            <span className='size-2 rounded-full bg-rose-500' />
            {t('finance.categories.expense')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className='mt-4'>
          <div className='rounded-xl border bg-card shadow-xs overflow-hidden'>
            {loading && categories.length === 0 ? (
              <div className='p-8'>
                <Loading />
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className='py-12 text-center text-muted-foreground'>
                Chưa có hạng mục nào trong nhóm này
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className='bg-muted/50'>
                    <TableHead className='w-36'>{t('finance.categories.code')}</TableHead>
                    <TableHead>{t('finance.categories.name')}</TableHead>
                    <TableHead className='w-24 text-center'>{t('finance.categories.sort')}</TableHead>
                    <TableHead className='text-center w-28'>{t('finance.categories.status')}</TableHead>
                    <TableHead className='text-right w-20'>Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((c) => (
                    <TableRow key={c.id} className='hover:bg-muted/30'>
                      <TableCell className='font-mono text-xs font-semibold'>
                        <Badge variant='outline'>{c.code}</Badge>
                      </TableCell>
                      <TableCell className='font-medium'>
                        <div className='flex items-center gap-2'>
                          <Tag className='size-4 text-muted-foreground' />
                          <span>{c.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className='text-center text-xs text-muted-foreground font-mono'>
                        {c.sortOrder}
                      </TableCell>
                      <TableCell className='text-center'>
                        <Badge
                          variant={c.isActive ? 'outline' : 'secondary'}
                          className={
                            c.isActive
                              ? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:bg-emerald-950/40'
                              : 'text-muted-foreground'
                          }
                        >
                          {c.isActive
                            ? t('finance.categories.active')
                            : t('finance.categories.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-right'>
                        <Button
                          variant='ghost'
                          size='icon-sm'
                          onClick={() => openEditDialog(c)}
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
        </TabsContent>
      </Tabs>

      {/* Add / Edit Category Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>
              {editingCategory
                ? t('finance.categories.editCategory')
                : t('finance.categories.addCategory')}
            </DialogTitle>
            <DialogDescription>
              Thiết lập hạng mục để phân loại nguồn thu hoặc khoản chi
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 py-2'>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='text-xs font-medium text-muted-foreground'>
                  {t('finance.categories.code')} *
                </label>
                <Input
                  placeholder='THU-HOC-PHI'
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  disabled={Boolean(editingCategory)}
                  className='mt-1 uppercase font-mono text-sm'
                />
              </div>
              <div>
                <label className='text-xs font-medium text-muted-foreground'>
                  {t('finance.categories.type')} *
                </label>
                <Select
                  value={formType}
                  onValueChange={(val) => {
                    if (val === 'income' || val === 'expense') setFormType(val);
                  }}
                  disabled={Boolean(editingCategory)}
                >
                  <SelectTrigger className='mt-1 w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='income'>{t('finance.categories.income')}</SelectItem>
                    <SelectItem value='expense'>{t('finance.categories.expense')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className='text-xs font-medium text-muted-foreground'>
                {t('finance.categories.name')} *
              </label>
              <Input
                placeholder='Học phí cờ vua...'
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className='mt-1'
              />
            </div>

            <div>
              <label className='text-xs font-medium text-muted-foreground'>
                {t('finance.categories.sort')}
              </label>
              <Input
                type='number'
                value={formSortOrder}
                onChange={(e) => setFormSortOrder(e.target.value)}
                className='mt-1 font-mono'
              />
            </div>

            <div className='flex items-center justify-between rounded-lg border p-3'>
              <div>
                <div className='text-sm font-medium'>Kích hoạt danh mục</div>
                <div className='text-xs text-muted-foreground'>
                  Cho phép chọn hạng mục này khi lập phiếu thu chi
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
              {submission.submitting ? 'Đang lưu...' : t('finance.categories.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
