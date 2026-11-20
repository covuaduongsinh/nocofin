import { defineSeed } from '@nocobase/db';

export default defineSeed({
  name: '202611200001_seed_finance_data',
  transaction: true,
  async run({ query }) {
    // 1. Branches (2 branches for Duong Sinh Chess)
    const branches = [
      {
        id: 'branch-cs01',
        code: 'CS-01',
        name: 'Cơ sở 1',
        kind: 'club',
        active: true,
        note: 'Cơ sở đào tạo cờ vua 1',
      },
      {
        id: 'branch-cs02',
        code: 'CS-02',
        name: 'Cơ sở 2',
        kind: 'club',
        active: true,
        note: 'Cơ sở đào tạo cờ vua 2',
      },
    ];

    for (const b of branches) {
      const existing = await query
        .selectFrom('finBranches')
        .select('id')
        .where('code', '=', b.code)
        .executeTakeFirst();
      if (!existing) {
        await query.insertInto('finBranches').values(b).execute();
      }
    }

    // 2. Fund Accounts (Primary bank account + 2 cash accounts)
    const accounts = [
      {
        id: 'acc-bank-01',
        code: 'TK-BANK-01',
        name: 'Tài khoản Ngân hàng chính (Học phí & Bán hàng)',
        kind: 'bank',
        bankName: 'Vietcombank',
        accountNumber: '1234567890',
        openingBalance: 0,
        active: true,
        note: 'Tiếp nhận học phí chuyển khoản và thanh toán bán học cụ',
      },
      {
        id: 'acc-cash-01',
        code: 'TK-CASH-01',
        name: 'Quỹ tiền mặt Cơ sở 1',
        kind: 'cash',
        bankName: null,
        accountNumber: null,
        openingBalance: 0,
        active: true,
        note: 'Quỹ tiền mặt tại bàn lễ tân Cơ sở 1',
      },
      {
        id: 'acc-cash-02',
        code: 'TK-CASH-02',
        name: 'Quỹ tiền mặt Cơ sở 2',
        kind: 'cash',
        bankName: null,
        accountNumber: null,
        openingBalance: 0,
        active: true,
        note: 'Quỹ tiền mặt tại bàn lễ tân Cơ sở 2',
      },
    ];

    for (const a of accounts) {
      const existing = await query
        .selectFrom('finAccounts')
        .select('id')
        .where('code', '=', a.code)
        .executeTakeFirst();
      if (!existing) {
        await query.insertInto('finAccounts').values(a).execute();
      }
    }

    // 3. Categories for Duong Sinh Chess
    const categories = [
      // Income
      {
        id: 'cat-thu-hp-clb',
        code: 'THU-HP-CLB',
        name: 'Học phí CLB (theo khoá/tháng)',
        type: 'income',
        sort: 10,
        active: true,
      },
      {
        id: 'cat-thu-hp-vip',
        code: 'THU-HP-VIP',
        name: 'Học phí kèm 1-1 / Lớp VIP',
        type: 'income',
        sort: 20,
        active: true,
      },
      {
        id: 'cat-thu-hp-truong',
        code: 'THU-HP-TRUONG',
        name: 'Học phí liên kết trường học',
        type: 'income',
        sort: 30,
        active: true,
      },
      {
        id: 'cat-thu-ban-cu',
        code: 'THU-BAN-CU',
        name: 'Bán bàn cờ, quân cờ, đồng hồ thi đấu',
        type: 'income',
        sort: 40,
        active: true,
      },
      {
        id: 'cat-thu-ban-sach',
        code: 'THU-BAN-SACH',
        name: 'Bán sách, giáo trình cờ vua',
        type: 'income',
        sort: 50,
        active: true,
      },
      {
        id: 'cat-thu-le-phi-giai',
        code: 'THU-LE-PHI-GIAI',
        name: 'Lệ phí thi đấu giải cờ vua',
        type: 'income',
        sort: 60,
        active: true,
      },
      {
        id: 'cat-thu-tai-tro',
        code: 'THU-TAI-TRO',
        name: 'Tài trợ & Quảng cáo giải đấu',
        type: 'income',
        sort: 70,
        active: true,
      },
      {
        id: 'cat-thu-khac',
        code: 'THU-KHAC',
        name: 'Thu khác',
        type: 'income',
        sort: 80,
        active: true,
      },

      // Expense
      {
        id: 'cat-chi-luong-hlv',
        code: 'CHI-LUONG-HLV',
        name: 'Thù lao & Lương HLV cờ vua',
        type: 'expense',
        sort: 110,
        active: true,
      },
      {
        id: 'cat-chi-mat-bang',
        code: 'CHI-MAT-BANG',
        name: 'Thuê mặt bằng cơ sở',
        type: 'expense',
        sort: 120,
        active: true,
      },
      {
        id: 'cat-chi-dien-nuoc',
        code: 'CHI-DIEN-NUOC',
        name: 'Điện, nước, internet cơ sở',
        type: 'expense',
        sort: 130,
        active: true,
      },
      {
        id: 'cat-chi-mua-thiet-bi',
        code: 'CHI-MUA-THIET-BI',
        name: 'Mua sắm thiết bị, bàn cờ, đồng hồ',
        type: 'expense',
        sort: 140,
        active: true,
      },
      {
        id: 'cat-chi-in-giao-trinh',
        code: 'CHI-IN-GIAO-TRINH',
        name: 'In ấn sách, giáo trình',
        type: 'expense',
        sort: 150,
        active: true,
      },
      {
        id: 'cat-chi-to-chuc-giai',
        code: 'CHI-TO-CHUC-GIAI',
        name: 'Chi phí tổ chức giải đấu (cúp, cờ, giải thưởng)',
        type: 'expense',
        sort: 160,
        active: true,
      },
      {
        id: 'cat-chi-marketing',
        code: 'CHI-MARKETING',
        name: 'Chi phí tuyển sinh & Marketing',
        type: 'expense',
        sort: 170,
        active: true,
      },
      {
        id: 'cat-chi-van-hanh',
        code: 'CHI-VAN-HANH',
        name: 'Chi phí văn phòng phẩm & Hành chính',
        type: 'expense',
        sort: 180,
        active: true,
      },
      {
        id: 'cat-chi-khac',
        code: 'CHI-KHAC',
        name: 'Chi khác',
        type: 'expense',
        sort: 190,
        active: true,
      },
    ];

    for (const c of categories) {
      const existing = await query
        .selectFrom('finCategories')
        .select('id')
        .where('code', '=', c.code)
        .executeTakeFirst();
      if (!existing) {
        await query.insertInto('finCategories').values(c).execute();
      }
    }
  },
});
