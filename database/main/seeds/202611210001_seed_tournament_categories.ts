import { defineSeed } from '@nocobase/db';

// The expense categories a tournament budget needs. Income reuses THU-LE-PHI-GIAI (entry fees) and THU-TAI-TRO
// (sponsorship) from 202611200001_seed_finance_data. Created only when missing, so an administrator's renames stay.
export default defineSeed({
  name: '202611210001_seed_tournament_categories',
  transaction: true,
  async run({ query }) {
    const categories = [
      {
        id: 'cat-chi-giai-thuong',
        code: 'CHI-GIAI-THUONG',
        name: 'Giải thưởng, cúp, huy chương',
        type: 'expense',
        sort: 161,
        active: true,
      },
      {
        id: 'cat-chi-trong-tai',
        code: 'CHI-TRONG-TAI',
        name: 'Thù lao trọng tài & ban tổ chức',
        type: 'expense',
        sort: 162,
        active: true,
      },
      {
        id: 'cat-chi-dia-diem-giai',
        code: 'CHI-DIA-DIEM-GIAI',
        name: 'Thuê địa điểm & thiết bị giải',
        type: 'expense',
        sort: 163,
        active: true,
      },
      {
        id: 'cat-chi-truyen-thong-giai',
        code: 'CHI-TRUYEN-THONG-GIAI',
        name: 'In ấn & truyền thông giải',
        type: 'expense',
        sort: 164,
        active: true,
      },
    ];

    for (const category of categories) {
      const existing = await query
        .selectFrom('finCategories')
        .select('id')
        .where('code', '=', category.code)
        .executeTakeFirst();
      if (!existing)
        await query.insertInto('finCategories').values(category).execute();
    }
  },
});
