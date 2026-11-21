import type { DeviceApprovalLocale } from '#extensions/nocobase-device-approval/locales/en-US';
import type { InboxLocale } from '#extensions/nocobase-inbox/locales/en-US';
import type databaseExplorerEnUS from '../pages/settings/database-explorer/en-US.js';
import type settingsEnUS from './system/settings-en-US.js';
import type { SystemResource } from './system/en-US.js';

/**
 * Vietnamese copy of what the template ships (the shell, sign-in pages, shared components, settings and the
 * homepage). It lives outside `./system/` because a template upgrade replaces that folder and the template ships no
 * vi-VN copy. When an upgrade adds keys to `./system/en-US.ts`, the `SystemResource` type flags them here.
 */

const databaseExplorer = {
  title: 'Trình duyệt cơ sở dữ liệu',
  description: 'Xem các kết nối cơ sở dữ liệu, bảng và trường của ứng dụng.',
  connection: 'Kết nối',
  chooseConnection: 'Chọn kết nối',
  defaultConnection: 'Mặc định',
  schemaManagement: {
    managed: 'Do ứng dụng quản lý',
    external: 'Quản lý bên ngoài',
  },
  tables: 'Bảng',
  tablesIn: 'Các bảng trong {{connection}}',
  searchTables: 'Tìm theo tên hoặc tiêu đề bảng',
  clearSearch: 'Xoá tìm kiếm',
  tableCount_one: '{{count}} bảng',
  tableCount_other: '{{count}} bảng',
  tablesMatched_one: '{{count}} / {{total}} bảng khớp',
  tablesMatched_other: '{{count}} / {{total}} bảng khớp',
  loadingTables_one: 'Đang tải bảng… đã đọc {{count}}',
  loadingTables_other: 'Đang tải bảng… đã đọc {{count}}',
  truncated_one:
    'Chỉ liệt kê {{count}} bảng đầu tiên; tìm kiếm chỉ áp dụng cho bảng này.',
  truncated_other:
    'Chỉ liệt kê {{count}} bảng đầu tiên; tìm kiếm chỉ áp dụng cho các bảng này.',
  partial_one:
    'Đã dừng tải sau {{count}} bảng; tìm kiếm chỉ áp dụng cho các bảng này.',
  partial_other:
    'Đã dừng tải sau {{count}} bảng; tìm kiếm chỉ áp dụng cho các bảng này.',
  selectedHidden: 'Bảng đang mở “{{table}}” không khớp với tìm kiếm.',
  kind: {
    table: 'Bảng',
    view: 'View',
    materializedView: 'Materialized view',
  },
  kindLabel: 'Loại',
  collectionName: 'Tên',
  tableName: 'Bảng',
  schema: 'Schema',
  fields: 'Trường',
  fieldsOf: 'Các trường của {{table}}',
  searchFields: 'Tìm theo tên, tiêu đề hoặc kiểu trường',
  fieldCount_one: '{{count}} trường',
  fieldCount_other: '{{count}} trường',
  fieldsMatched_one: '{{count}} / {{total}} trường khớp',
  fieldsMatched_other: '{{count}} / {{total}} trường khớp',
  column: {
    field: 'Trường',
    type: 'Kiểu',
    nullable: 'Cho phép rỗng',
    references: 'Tham chiếu',
  },
  primaryKey: 'Khoá chính',
  yes: 'Có',
  no: 'Không',
  notReported: 'Không có thông tin',
  notApplicable: 'Không áp dụng',
  relationNullable: 'Quan hệ, không phải cột',
  nullableTag: {
    yes: 'Cho phép rỗng',
    no: 'Không rỗng',
    unknown: 'Không rõ có cho phép rỗng',
  },
  none: 'Không có',
  warnings_one: '{{count}} ghi chú kiểm tra',
  warnings_other: '{{count}} ghi chú kiểm tra',
  warningDescription: 'Một số thông tin có thể chưa đầy đủ.',
  backToTables: 'Tất cả bảng',
  selectTable: 'Chọn một bảng để xem các trường.',
  loading: 'Đang tải',
  signIn: 'Đăng nhập',
  retry: 'Thử lại',
  notice: {
    unauthenticated: 'Phiên đăng nhập đã hết hạn',
    forbidden: 'Bạn không có quyền xem cơ sở dữ liệu',
    connectionNotFound: 'Kết nối này không tồn tại',
    tableNotFound: 'Bảng này không tồn tại trong kết nối',
    unavailable: 'Cơ sở dữ liệu hiện không khả dụng',
    failed: 'Không thể tải thông tin cơ sở dữ liệu',
    noConnections: 'Chưa cấu hình kết nối cơ sở dữ liệu nào',
    noTables: 'Kết nối này không có bảng nào',
    noFields: 'Bảng này không có trường nào',
    noResults: 'Không có kết quả',
  },
} satisfies typeof databaseExplorerEnUS;

const settings = {
  notificationManagementDescription:
    'Xem các mẫu thông báo đã đăng ký và bản xem trước nội dung mẫu.',
  notificationTemplates: 'Mẫu thông báo',
  notificationManagement: 'Quản lý thông báo',
  listChanged: 'Danh sách đã thay đổi. Vui lòng thử lại.',
  setup: {
    title: 'Điều kiện tiên quyết của tính năng',
    checking: 'Đang kiểm tra cấu hình hiện tại…',
    checkAgain: 'Kiểm tra lại',
    ready: 'Các điều kiện tiên quyết đã sẵn sàng.',
    missing: 'Hãy xem lại các mục cấu hình bên dưới.',
    manageMembers: 'Quản lý thành viên',
    manageMembersFor: 'Quản lý thành viên {{role}}',
    unavailable: 'Hiện không thể kiểm tra. Hãy thử lại.',
    signIn: 'Phiên đăng nhập đã hết hạn. Đăng nhập lại để kiểm tra cấu hình.',
    forbidden:
      'Bạn không có quyền kiểm tra cấu hình này. Hãy liên hệ quản trị viên.',
    invalid:
      'Không thể xác minh điều kiện này. Hãy nhờ người bảo trì ứng dụng kiểm tra cấu hình.',
  },
  roleFilterIncomplete:
    'Hãy chọn cả phạm vi vai trò và vai trò, hoặc xoá bộ lọc.',
  backToSource: 'Quay lại trang trước',
  roleFilter: 'Lọc theo vai trò',
  allRoles: 'Tất cả vai trò',

  permissionManagement: 'Quản lý phân quyền',
  defaultAccess: {
    noResourcesShort: 'Không có đối tượng nào để cấu hình',
    scopeInvalid:
      'Hãy chọn phạm vi dữ liệu hợp lệ hoặc hoàn thiện điều kiện lọc.',

    deleteChanged:
      'Quy tắc này đã thay đổi hoặc bị xoá. Danh sách đã được làm mới; hãy xem lại trước khi xoá.',
    filterDescription:
      'Áp dụng điều kiện cho bản nháp quy tắc này, sau đó lưu quy tắc để có hiệu lực.',
    fieldLabels: { name: 'Tên', id: 'ID' },
    delete: 'Xoá',
    title: 'Phạm vi dữ liệu mặc định',
    description:
      'Bổ sung quyền truy cập dữ liệu cho người dùng có quyền thao tác, kết hợp với phạm vi do vai trò cấp và chịu sự ràng buộc của quy tắc hạn chế.',
    manage: 'Quản lý phạm vi dữ liệu mặc định',
    new: 'Phạm vi mặc định mới',
    edit: 'Chi tiết phạm vi mặc định',
    resource: 'Đối tượng nghiệp vụ',
    chooseResource: 'Chọn đối tượng nghiệp vụ',
    action: 'Thao tác',
    scope: 'Phạm vi dữ liệu',
    scopes: 'Thao tác và phạm vi dữ liệu',
    none: 'Không có phạm vi mặc định',
    all: 'Tất cả bản ghi',
    custom: 'Bộ lọc tuỳ chỉnh',
    records: 'Bản ghi đã chọn ({{count}})',
    retained: 'Giữ cấu hình hiện có',
    search: 'Tìm đối tượng nghiệp vụ hoặc khoá',
    noResources:
      'Mọi đối tượng nghiệp vụ khả dụng đều đã có quy tắc mặc định, hoặc chưa có đối tượng nào được đăng ký để cấu hình.',
    unsupported:
      'Quy tắc này có cấu hình không có trong danh mục plugin hiện tại. Cấu hình được giữ nguyên và chỉ hiển thị để xem.',
    changed:
      'Quy tắc này đã thay đổi hoặc bị xoá trong lúc bạn chỉnh sửa. Hãy tải lại trước khi lưu. Bản nháp của bạn chưa được lưu.',
    duplicate:
      'Khoá hoặc đối tượng nghiệp vụ này đã có quy tắc mặc định. Hãy dùng khoá khác hoặc sửa quy tắc hiện có.',
    invalid:
      'Cấu hình không được chấp nhận. Hãy kiểm tra đối tượng nghiệp vụ, thao tác và phạm vi dữ liệu.',
    keyRequired: 'Nhập một khoá khác options, subjects hoặc records.',
    resourceRequired: 'Hãy chọn đối tượng nghiệp vụ.',
    reload: 'Tải lại quy tắc',
    saved: 'Đã lưu phạm vi mặc định “{{name}}”',
    deleted: 'Đã xoá phạm vi mặc định “{{name}}”',
    deleteTitle: 'Xoá phạm vi mặc định “{{name}}”?',
    deleteHint:
      'Thao tác này gỡ bỏ quyền truy cập cơ bản do quy tắc này cung cấp. Quyền do vai trò cấp và các quy tắc khác vẫn giữ nguyên. Không thể hoàn tác.',
    back: 'Quay lại phạm vi mặc định',
    open: 'Xem / sửa',
  },
  scopeHintFor: 'Về phạm vi dữ liệu của {{name}}',
  scopeExplanation:
    'Mỗi phạm vi áp dụng cho dữ liệu tương ứng. Thao tác cũng phải vượt qua các bước kiểm tra phân quyền.',
  noAdditionalScopeHint:
    'Vai trò này không cấp thêm bản ghi nào. Quyền truy cập thực tế còn phụ thuộc vào các vai trò khác và các quy tắc mặc định, chia sẻ, hạn chế.',
  systemToolsHint:
    'Quản lý cấu hình và công cụ hệ thống. Hãy xem kỹ các khả năng của từng thao tác trước khi cấp quyền.',
  userAccountsHint:
    'Quản lý thông tin người dùng, bảo mật tài khoản và phân vai trò. Hãy xem xét từng quyền riêng biệt.',
  businessOperationsHint:
    'Chọn các thao tác vai trò này được thực hiện và dữ liệu mỗi thao tác được dùng.',
  roleAssignment: 'Phân vai trò',
  accountSecurity: 'Bảo mật tài khoản',
  userInformation: 'Thông tin người dùng',
  unnamedPage: 'Trang chưa đặt tên ({{path}})',
  revokeRoles: 'Thu hồi vai trò',
  keyConflict: 'Khoá vai trò này đã được sử dụng.',
  userPermissions: 'Người dùng và tài khoản',
  readUsers: 'Xem người dùng',
  createUsers: 'Tạo người dùng',
  updateUsers: 'Sửa người dùng',
  inviteUsers: 'Mời người dùng',
  deleteUsers: 'Xoá người dùng',
  resetUserPassword: 'Đặt lại mật khẩu',
  assignRole: 'Phân vai trò',

  assignedRoles: 'Vai trò đã phân',
  actionSaved: 'Đã cập nhật quyền truy cập cho "{{name}}"',
  userActionSaved: {
    disable: 'Đã vô hiệu hoá người dùng "{{name}}"',
    enable: 'Đã kích hoạt người dùng "{{name}}"',
    revokeSessions: 'Đã thu hồi các phiên đang hoạt động của "{{name}}"',
  },

  identityConflict: 'Email hoặc tên đăng nhập này đã được sử dụng.',
  signInAgain: 'Đăng nhập lại',
  passwordPolicy: 'Mật khẩu không đáp ứng chính sách mật khẩu hiện tại.',

  reload: 'Tải lại vai trò',
  title: 'Cài đặt hệ thống',
  home: {
    description:
      'Tài khoản, phân quyền, cấu hình nghiệp vụ và các khả năng hệ thống đều nằm ở đây.',
    empty: 'Bạn chưa có mục cài đặt nào.',
  },
  categories: {
    account: 'Tài khoản và phân quyền',
    business: 'Cấu hình nghiệp vụ',
    ai: 'AI',
    system: 'Hệ thống',
  },
  permissionManagementDescription:
    'Thiết lập những gì mỗi vai trò được mở, được làm và dữ liệu được xem.',
  users: 'Người dùng',
  roles: 'Vai trò và phân quyền',
  usersDescription: 'Quản lý tài khoản, quyền truy cập và phiên đăng nhập.',
  rolesDescription: 'Xác định mỗi vai trò được truy cập và làm gì.',
  userSearch: 'Tìm theo tên, tên đăng nhập hoặc email',
  roleSearch: 'Tìm tên vai trò',
  newUser: 'Người dùng mới',
  editUserFor: 'Sửa {{name}}',
  editUser: 'Sửa người dùng',
  newRole: 'Vai trò mới',
  editRole: 'Sửa vai trò',
  name: 'Họ tên',
  username: 'Tên đăng nhập',
  email: 'Email',
  password: 'Mật khẩu ban đầu',
  roleType: 'Loại vai trò',
  roleName: 'Tên vai trò',
  key: 'Khoá',
  status: 'Trạng thái',
  actions: 'Thao tác',
  actionsFor: 'Thao tác cho {{name}}',
  all: 'Tất cả trạng thái',
  enabled: 'Đang bật',
  disabled: 'Đã tắt',
  clear: 'Xoá bộ lọc',
  noResults: 'Không có kết quả phù hợp',
  clearHint: 'Hãy thử tìm kiếm khác hoặc xoá bộ lọc.',
  noUsers: 'Chưa có người dùng',
  noRoleAccess:
    'Người dùng này vẫn đăng nhập và dùng được các chức năng tài khoản cơ bản. Chưa có quyền nghiệp vụ nào được cấp qua vai trò.',
  noAssignedRoles: 'Chưa được phân vai trò',
  noRoles: 'Chưa có vai trò',
  create: 'Tạo',
  edit: 'Sửa',
  selectRoles: 'Chọn vai trò',
  searchRoles: 'Tìm vai trò',
  noRolesFound: 'Không tìm thấy vai trò.',
  save: 'Lưu',
  cancel: 'Huỷ',
  saving: 'Đang lưu…',
  confirm: 'Xác nhận',
  enable: 'Bật',
  disable: 'Tắt',
  revokeSessions: 'Thu hồi phiên',
  disableTitle: 'Vô hiệu hoá người dùng "{{name}}"?',
  disableHint:
    'Người dùng này sẽ không thể đăng nhập và các phiên hiện có sẽ kết thúc.',
  enableTitle: 'Kích hoạt người dùng "{{name}}"?',
  enableHint: 'Người dùng này sẽ có thể đăng nhập lại.',
  revokeTitle: 'Thu hồi phiên của "{{name}}"?',
  revokeHint: 'Người dùng này sẽ phải đăng nhập lại.',
  revokeRoleTitle: 'Thu hồi vai trò của "{{name}}"?',
  revokeRoleHint: 'Quyền truy cập do các vai trò đã liệt kê cấp sẽ bị gỡ bỏ.',
  created: 'Đã tạo người dùng "{{name}}"',
  saved: 'Đã lưu "{{name}}"',
  rolesSaved: 'Đã cập nhật vai trò cho "{{name}}"',
  required: 'Hãy nhập giá trị cho trường này',
  invalidEmail: 'Hãy nhập địa chỉ email hợp lệ',
  protected: 'Được bảo vệ',
  custom: 'Tuỳ chỉnh',
  protectedHint:
    'Vai trò này được bảo vệ. Chỉ có thể thực hiện những thay đổi được cho phép rõ ràng.',
  unsaved: 'Có thay đổi chưa lưu',
  discardTitle: 'Huỷ bỏ thay đổi?',
  discardHint: 'Các thay đổi chưa lưu của bạn sẽ bị mất.',
  failed: 'Không thể hoàn tất yêu cầu. Hãy thử lại.',
  invalidRequest:
    'Một số giá trị không hợp lệ. Hãy kiểm tra dữ liệu nhập hoặc bộ lọc rồi thử lại.',
  retry: 'Thử lại',
  loading: 'Đang tải',
  denied: 'Bạn không có quyền truy cập. Hãy liên hệ quản trị viên.',
  missing: 'Bản ghi này không tồn tại hoặc đã bị xoá.',
  conflict:
    'Yêu cầu xung đột với dữ liệu hiện tại. Hãy xem bản ghi mới nhất trước khi thử lại.',
  sessionEnded: 'Phiên đăng nhập đã kết thúc. Hãy đăng nhập lại.',
  previous: 'Trước',
  next: 'Sau',
  total_one: '{{count}} người dùng',
  total_other: '{{count}} người dùng',
  access: 'Quyền truy cập',
  expandPermissionGroup: 'Mở rộng {{name}}',
  collapsePermissionGroup: 'Thu gọn {{name}}',
  pagesOutsideNavigation: 'Trang ngoài thanh điều hướng',
  configurationPermissions: 'Quyền cấu hình',
  configurationPermissionsHint:
    'Kiểm soát quyền truy cập và thao tác với cài đặt hệ thống, quản lý người dùng và cấu hình nghiệp vụ. Chỉ hiển thị các tính năng thực có của ứng dụng.',
  permissionSearch: 'Tìm danh mục, nhóm hoặc quyền',
  permissionAll: 'Tất cả',
  permissionGranted: 'Đã cấp',
  permissionUngranted: 'Chưa cấp',
  permissionStatus: 'Trạng thái cấp quyền',
  permissionClearSearch: 'Xoá tìm kiếm',
  permissionCollapseAll: 'Thu gọn tất cả',
  permissionExpandAll: 'Mở rộng tất cả',
  enabledOnly: 'Chỉ mục đang bật',
  noPermissions: 'Không có quyền nào để cấu hình',
  permissionEmptyHint:
    'Hãy nhờ nhà phát triển ứng dụng cung cấp các quyền mà vai trò này có thể cấu hình.',
  permissionReadOnlyHint: 'Các quyền này chỉ để xem.',
  permissionManagedHint: 'Quyền này do ứng dụng quản lý.',
  permissionSaveHint: 'Thay đổi phân quyền có hiệu lực sau khi lưu.',
  permissionCategories: 'Danh mục quyền',
  selectAllPermissions: 'Tất cả',
  dataRanges: 'Phạm vi dữ liệu ({{count}})',
  selectVisiblePermissions: 'Chọn các quyền đang hiển thị trong {{name}}',
  permissionSummary: 'Đã bật {{enabled}} / {{total}}',
  preservedRecordScope: 'Giữ cấu hình hiện có',
  noRecordScope: 'Dùng quy tắc mặc định',
  permissionFilter: {
    limit: 'Tối đa 20 điều kiện',
    configure: 'Điều kiện',
    title: 'Cấu hình bộ lọc bản ghi',
    description:
      'Áp dụng điều kiện cho bản nháp vai trò, sau đó lưu vai trò để có hiệu lực.',
    all: 'Khớp tất cả điều kiện',
    any: 'Khớp bất kỳ điều kiện nào',
    field: 'Trường',
    operator: 'Toán tử',
    valueType: 'Kiểu giá trị',
    value: 'Giá trị',
    text: 'Văn bản',
    number: 'Số',
    boolean: 'Đúng/Sai',
    true: 'Có',
    false: 'Không',
    add: 'Thêm điều kiện',
    remove: 'Xoá',
    cancel: 'Huỷ',
    apply: 'Áp dụng',
    invalid:
      'Hãy chọn trường hợp lệ và điền đủ giá trị. Cần ít nhất một điều kiện.',
    advanced:
      'Bộ lọc hiện có dùng điều kiện nâng cao. Bộ lọc được giữ nguyên trừ khi bạn chủ động cấu hình lại.',
    reconfigure: 'Cấu hình lại',
    operators: {
      $eq: 'Bằng',
      $ne: 'Khác',
      $includes: 'Chứa',
      $gt: 'Lớn hơn',
      $gte: 'Tối thiểu',
      $lt: 'Nhỏ hơn',
      $lte: 'Tối đa',
      $empty: 'Rỗng',
      $notEmpty: 'Không rỗng',
    },
  },
  recordScope: 'Phạm vi bản ghi',
  levelFor: 'Phạm vi cho {{name}}',
} satisfies typeof settingsEnUS;

const formFeedback = {
  field: 'Giá trị này không hợp lệ. Hãy kiểm tra rồi thử lại.',
  invalid: 'Hãy kiểm tra các trường được đánh dấu rồi thử lại.',
  failed: 'Không thể lưu. Dữ liệu bạn nhập vẫn được giữ. Hãy thử lại.',
  network:
    'Không thể kết nối. Hãy kiểm tra mạng rồi thử lại. Dữ liệu bạn nhập vẫn được giữ.',
  denied:
    'Bạn không thể gửi biểu mẫu này với quyền hiện tại. Dữ liệu bạn nhập vẫn được giữ.',
};

// The UI Library block of the `/device` page ships no vi-VN locale, so its copy is translated here.
const deviceApprovalViVN: DeviceApprovalLocale = {
  formFeedback,
  'deviceApproval.title': 'Cấp quyền cho thiết bị',
  'deviceApproval.description':
    'Một dòng lệnh hoặc thiết bị khác yêu cầu đăng nhập bằng tài khoản của bạn. Chỉ phê duyệt nếu chính bạn đã bắt đầu đăng nhập.',
  'deviceApproval.enterCode': 'Nhập mã hiển thị trên thiết bị của bạn.',
  'deviceApproval.codeLabel': 'Mã',
  'deviceApproval.continue': 'Tiếp tục',
  'deviceApproval.checking': 'Đang kiểm tra mã…',
  'deviceApproval.confirm':
    'Kiểm tra mã này có khớp với mã trên thiết bị của bạn không.',
  'deviceApproval.client': 'Yêu cầu từ {{client}}',
  'deviceApproval.approve': 'Phê duyệt',
  'deviceApproval.approving': 'Đang phê duyệt…',
  'deviceApproval.deny': 'Từ chối',
  'deviceApproval.denying': 'Đang từ chối…',
  'deviceApproval.approved':
    'Đã phê duyệt thiết bị. Quay lại cửa sổ dòng lệnh để tiếp tục; bạn có thể đóng trang này.',
  'deviceApproval.denied':
    'Đã từ chối yêu cầu. Thiết bị chưa được đăng nhập; bạn có thể đóng trang này.',
  'deviceApproval.expired':
    'Mã này đã hết hạn. Hãy bắt đầu đăng nhập lại trên thiết bị.',
  'deviceApproval.invalid':
    'Mã này không hợp lệ. Hãy đối chiếu với thiết bị rồi thử lại.',
  'deviceApproval.notYours': 'Mã này đang được một tài khoản khác phê duyệt.',
  'deviceApproval.error': 'Đã xảy ra lỗi. Hãy thử lại.',
  'deviceApproval.retry': 'Thử lại',
  'deviceApproval.otherCode': 'Nhập mã khác',
};

// The UI Library block of the `/inbox` page ships no vi-VN locale, so its copy is translated here.
const inboxViVN: InboxLocale = {
  'inbox.title': 'Hộp thư',
  'inbox.description': 'Thông báo và yêu cầu gửi đến bạn.',
  'inbox.views.all': 'Tất cả',
  'inbox.views.todo': 'Cần xử lý',
  'inbox.kinds.label': 'Loại',
  'inbox.kinds.all': 'Tất cả loại',
  'inbox.kinds.decision': 'Cần quyết định',
  'inbox.kinds.info': 'Thông báo',
  'inbox.tabs.decision': 'Chờ tôi quyết định',
  'inbox.tabs.info': 'Thông báo',
  'inbox.clearFilter': 'Xoá bộ lọc',
  'inbox.noMatchDescription': 'Xoá bộ lọc để xem mọi loại.',
  'inbox.readAll': 'Đánh dấu tất cả đã đọc',
  'inbox.allRead': 'Đã đánh dấu tất cả là đã đọc.',
  'inbox.loading': 'Đang tải',
  'inbox.loadFailed': 'Không thể tải hộp thư',
  'inbox.loadFailedDescription': 'Hãy kiểm tra kết nối rồi thử lại.',
  'inbox.retry': 'Thử lại',
  'inbox.loadMore': 'Tải thêm',
  'inbox.emptyAll': 'Chưa có gì ở đây',
  'inbox.empty.todo': 'Không có việc nào chờ bạn',
  'inbox.empty.decision': 'Không có quyết định nào chờ bạn',
  'inbox.empty.info': 'Không có thông báo',
  'inbox.emptyDescription':
    'Thông báo và yêu cầu gửi đến bạn sẽ hiển thị ở đây.',
  'inbox.unread': 'Chưa đọc',
  'inbox.unreadCount': '{{count}} chưa đọc',
  'inbox.pendingDecisions': '{{count}} đang chờ',
  'inbox.resolved': 'Đã xử lý',
  'inbox.outcomes.approved': 'Đã duyệt',
  'inbox.outcomes.rejected': 'Đã từ chối',
  'inbox.outcomes.withdrawn': 'Đã rút lại',
  'inbox.count': '×{{count}}',
  'inbox.actionsFor': 'Thao tác cho {{title}}',
  'inbox.actions.read': 'Đánh dấu đã đọc',
  'inbox.actions.unread': 'Đánh dấu chưa đọc',
  'inbox.actions.delete': 'Xoá',
  'inbox.deleted': 'Đã xoá.',
  'inbox.requestFailed': 'Yêu cầu thất bại. Hãy thử lại.',
  'inbox.forbidden': 'Bạn không được phép thực hiện thao tác này.',
  'inbox.nothingSelected': 'Chọn một mục để xem',
  'inbox.back': 'Quay lại danh sách',
  'inbox.open': 'Mở',
  'inbox.keyMove': 'Di chuyển',
  'inbox.keyOpen': 'Mở',
  'inbox.cancel': 'Huỷ',
  'inbox.request.approve': 'Duyệt',
  'inbox.request.reject': 'Từ chối',
  'inbox.request.commentPlaceholder': 'Viết gì đó…',
  'inbox.request.commentFor': '{{action}}: {{title}}',
  'inbox.request.quickSend': 'để gửi',
  'inbox.request.newLine': 'để xuống dòng',
};

const systemViVN: SystemResource = {
  databaseExplorer,
  pendingFeedback: {
    working: 'Đang xử lý…',
    longWait:
      'Việc này mất nhiều thời gian hơn bình thường. Bạn có thể tiếp tục chờ.',
  },
  taskProgress: {
    queued: 'Đang chờ bắt đầu',
    running: 'Đang thực hiện',
    completed: 'Đã hoàn tất',
    failed: 'Thất bại',
    canceled: 'Đã huỷ',
    count: '{{processed}} / {{total}}',
    processed: 'Đã xử lý {{processed}}',
    background: 'Tác vụ vẫn tiếp tục chạy nếu bạn rời trang này.',
  },
  listFeedback: {
    loading: 'Đang tải',
    empty: 'Chưa có dữ liệu',
    noResults: 'Không có kết quả',
    forbidden: 'Không có quyền truy cập',
    unauthenticated: 'Phiên đăng nhập đã hết hạn',
    failed: 'Không thể tải danh sách',
    refreshFailed: 'Làm mới thất bại; đang hiển thị dữ liệu trước đó',
    retry: 'Thử lại',
    retrying: 'Đang thử lại…',
    clear: 'Xoá bộ lọc',
    signIn: 'Đăng nhập',
  },
  flowDiagram: {
    controls: 'Điều khiển sơ đồ',
    fitView: 'Vừa khung nhìn',
    fullscreen: 'Toàn màn hình',
    exitFullscreen: 'Thoát toàn màn hình',
    escapeHint: 'Nhấn Escape để thoát',
    leavesTo: 'Chuyển đến',
    arrivesFrom: 'Đến từ',
    otherRoutes: 'Luồng khác',
    minimap: 'Tổng quan sơ đồ',

    configure: 'Cấu hình',
    overview: 'Tổng quan sơ đồ',
    actualSize: 'Kích thước thực',
    states: 'Trạng thái',
    transitions: 'Chuyển tiếp',
    configurable: 'Tham số',
    current: 'Hiện tại',
    visited: 'Đã qua',
    initial: 'Ban đầu',
    final: 'Kết thúc',
    state: 'Trạng thái',
    zoomOut: 'Thu nhỏ',
    zoomIn: 'Phóng to',
    fit: 'Vừa khung nhìn',

    empty: 'Không có trạng thái nào để hiển thị.',
    loading: 'Đang dàn trang sơ đồ…',
    failed: 'Không thể dàn trang sơ đồ này.',
    nodeHelp: 'Nhấn Enter hoặc phím cách để chọn trạng thái.',
    edgeHelp: 'Nhấn Enter hoặc phím cách để chọn chuyển tiếp.',
  },
  settings,
  'auth.preparingSession': 'Đang chuẩn bị phiên đăng nhập…',
  'auth.connectionFailed': 'Không thể kết nối',
  'auth.connectionFailedDescription':
    'Chưa thể thiết lập kết nối thời gian thực. Hãy thử lại để vào ứng dụng, hoặc đăng xuất.',

  'auth.passwordResetSuccess':
    'Mật khẩu đã được đặt lại. Hãy đăng nhập bằng mật khẩu mới.',
  'auth.requestNewResetLink': 'Yêu cầu liên kết đặt lại mới',

  // The UI Library block of the `/device` page; the keys below may reword it.
  ...deviceApprovalViVN,
  // The UI Library block of the `/inbox` page; the keys below may reword it.
  ...inboxViVN,
  // Shared form wording overrides the defaults included by composed blocks.
  formFeedback,
  // The UI Library component of the header's inbox button.
  'inboxButton.title': 'Hộp thư',
  'inboxButton.pending': 'Hộp thư, {{count}} đang chờ',
  'inboxButton.unread': 'Hộp thư, {{count}} chưa đọc',
  'inboxButton.pendingHint':
    '{{count}} mục đang chờ bạn; số này giảm khi bạn xử lý xong.',
  'inboxButton.unreadHint': '{{count}} chưa đọc; số này giảm khi bạn đọc.',
  'auth.welcome': 'Chào mừng trở lại',
  'auth.loginDescription':
    'Đăng nhập bằng tên đăng nhập hoặc email và mật khẩu.',
  'auth.registerTitle': 'Tạo tài khoản',
  'auth.registerDescription': 'Tạo tài khoản để bắt đầu.',
  'auth.registrationAccepted': 'Đã gửi yêu cầu đăng ký',
  'auth.registrationGuidance':
    'Hãy thử đăng nhập bằng tên đăng nhập và mật khẩu vừa gửi. Nếu email này đã có tài khoản, thông tin mới sẽ không có hiệu lực; hãy đăng nhập bằng tài khoản cũ hoặc khôi phục mật khẩu. Nếu ứng dụng có hướng dẫn xác minh, hãy làm theo trước khi đăng nhập.',
  'auth.forgotTitle': 'Quên mật khẩu',
  'auth.forgotDescription':
    'Nhập email, chúng tôi sẽ gửi liên kết đặt lại nếu tài khoản tồn tại.',
  'auth.passwordResetUnavailable':
    'Chưa bật tự đặt lại mật khẩu. Hãy liên hệ quản trị viên để được đặt lại.',
  'auth.capabilityLoadFailed':
    'Không thể kiểm tra chức năng đặt lại mật khẩu có khả dụng không.',
  'auth.retry': 'Thử lại',
  'auth.loading': 'Đang tải',
  'auth.resetDescription': 'Chọn mật khẩu mới cho tài khoản của bạn.',
  'auth.resetTitle': 'Đặt lại mật khẩu',
  'auth.identifier': 'Tên đăng nhập hoặc email',
  'auth.password': 'Mật khẩu',
  'auth.signIn': 'Đăng nhập',
  'auth.signingIn': 'Đang đăng nhập…',
  'auth.hidePassword': 'Ẩn mật khẩu',
  'auth.showPassword': 'Hiện mật khẩu',
  'auth.forgotLink': 'Quên mật khẩu?',
  'auth.noAccount': 'Chưa có tài khoản?',
  'auth.signUp': 'Đăng ký',
  'auth.createAccount': 'Tạo tài khoản',
  'auth.creatingAccount': 'Đang tạo tài khoản…',
  'auth.name': 'Họ tên',
  'auth.username': 'Tên đăng nhập',
  'auth.email': 'Email',
  'auth.confirmPassword': 'Xác nhận mật khẩu',
  'auth.existingAccount': 'Đã có tài khoản?',
  'auth.passwordMismatch': 'Mật khẩu không khớp.',
  'auth.resetting': 'Đang đặt lại…',
  'auth.newPassword': 'Mật khẩu mới',
  'auth.confirmNewPassword': 'Xác nhận mật khẩu mới',
  'auth.invalidResetLink':
    'Liên kết đặt lại mật khẩu này không hợp lệ hoặc đã hết hạn.',
  'auth.backToSignIn': 'Quay lại đăng nhập',
  'auth.sendResetLink': 'Gửi liên kết đặt lại',
  'auth.sending': 'Đang gửi…',
  'auth.resetSent': 'Nếu tài khoản tồn tại, liên kết đặt lại đã được gửi.',
  'auth.rememberPassword': 'Đã nhớ mật khẩu?',
  'auth.methods': 'Phương thức đăng nhập',
  'auth.or': 'Hoặc tiếp tục với',
  'auth.continueWith': 'Tiếp tục với {provider}',
  'auth.about': 'Giới thiệu ứng dụng',
  'auth.platform': 'Nền tảng ứng dụng AI-native',
  'auth.marketingTitleFirst': 'AI + NocoBase',
  'auth.marketingTitleSecond': 'Xây dựng hệ thống nghiệp vụ tin cậy',
  'auth.marketingDescription':
    'AI dùng framework giao diện linh hoạt để định hình từng trải nghiệm, còn NocoBase đảm bảo dữ liệu, phân quyền và quản trị bên dưới.',
  'auth.frontend': 'Giao diện AI-native',
  'auth.frontendDescription':
    'Tự do xây dựng giao diện trên một framework linh hoạt.',
  'auth.foundation': 'Nền tảng NocoBase',
  'auth.foundationDescription':
    'Dữ liệu, kiểm soát truy cập và quản trị đáng tin cậy.',
  'auth.marketingFooter': 'Tự do phía trên. Vững chắc phía dưới.',
  'status.loading': 'Đang tải',
  'status.refreshing': 'Đang làm mới',
  'status.loadingPage': 'Đang tải trang',
  'status.denied': 'Không có quyền truy cập',
  'status.pageFailed': 'Không thể tải trang',
  'status.retry': 'Thử lại',
  'status.reloadPage': 'Tải lại trang',
  'status.retryFailedDescription':
    'Vẫn chưa tải được. Tải lại toàn bộ trang có thể giúp ích; các thay đổi chưa lưu trên trang này có thể bị mất.',
  'navigation.brandHome': 'Trang chủ NocoBase',
  'navigation.brandApps': 'Ứng dụng NocoBase',
  'routeOverlay.close': 'Đóng',
  'routeOverlay.discardTitle': 'Huỷ bỏ thay đổi?',
  'routeOverlay.discardDescription':
    'Các thay đổi của bạn chưa được lưu và sẽ bị mất.',
  'routeOverlay.keepEditing': 'Tiếp tục chỉnh sửa',
  'routeOverlay.discard': 'Huỷ bỏ',
  'status.deniedDescription': 'Bạn không có quyền truy cập {{label}}.',
  'status.routeFailedDescription':
    'Không thể tải trang {{label}} từ {{packageName}}.',
  shell: {
    brandPartnership: 'AI + <brand>NocoBase</brand>',
    buildReliableSystems: 'Xây dựng hệ thống nghiệp vụ tin cậy',
  },
  home: {
    platform: 'NocoBase · Nền tảng ứng dụng AI-native',
    title: 'Mô tả nhu cầu, agent sẽ xây dựng',
    description:
      'Ứng dụng này được phát triển bằng cách trò chuyện với coding agent. Hãy mô tả nhu cầu nghiệp vụ bằng lời thông thường, agent sẽ viết trang, mô hình dữ liệu, API và quy trình nghiệp vụ trong dự án này.',
    steps: {
      describe: {
        title: 'Mô tả nhu cầu',
        description:
          'Nói rõ ai sử dụng, cần lưu dữ liệu gì và điều gì cần xảy ra.',
      },
      build: {
        title: 'Để agent xây dựng',
        description:
          'Agent đọc dự án này cùng các khả năng có sẵn, rồi viết mã.',
      },
      review: {
        title: 'Kiểm tra và tinh chỉnh',
        description:
          'Tải lại trang để dùng thử, rồi yêu cầu chỉnh sửa theo cách tương tự.',
      },
    },
    example: {
      title: 'Thử một yêu cầu như sau',
      text: 'Xây dựng ứng dụng đơn đặt hàng mua.\n\nMỗi đơn có số đơn, mặt hàng, người đề nghị, số tiền và trạng thái duyệt. Người đề nghị tạo đơn và chỉ xem đơn của mình; người duyệt xem mọi đơn đang chờ duyệt và duyệt hoặc từ chối.\nSau khi có quyết định, thông báo cho người đề nghị qua hộp thư kèm liên kết đến đơn.',
      hint: 'Dán vào Claude Code, Codex, Cursor hoặc bất kỳ coding agent nào đang mở dự án này.',
    },
    capabilitiesTitle: 'Khả năng có sẵn',
    capabilitiesDescription:
      'Agent dùng trực tiếp các khả năng này thay vì xây dựng từ đầu. Mở một mục để lấy câu lệnh mẫu có thể sửa và sao chép.',
    viewPrompts: 'Xem câu lệnh mẫu ({{count}})',
    prompt: {
      label: 'Câu lệnh',
      hint: 'Sửa câu lệnh cho phù hợp với nghiệp vụ trước khi sao chép. Thay đổi không được lưu sau khi đóng hộp thoại.',
      copy: 'Sao chép',
      copiedShort: 'Đã sao chép',
      copied: 'Đã sao chép câu lệnh',
      copyFailed: 'Không thể sao chép. Hãy chọn văn bản và sao chép thủ công.',
      reset: 'Khôi phục mặc định',
    },
    capabilities: {
      auth: {
        title: 'Xác thực',
        description:
          'Đăng nhập, đăng ký, đặt lại mật khẩu và đăng nhập một lần (SSO) của công ty.',
        prompts: {
          disableSignUp: {
            label: 'Tắt đăng ký',
            text: 'Ứng dụng này chỉ dành cho nhân viên công ty. Quản trị viên tạo tất cả tài khoản.\nHãy tắt tự đăng ký và bỏ liên kết đăng ký khỏi trang đăng nhập.\nNhân viên hiện có vẫn phải đăng nhập được bằng tài khoản và mật khẩu của mình.\nGiữ liên kết quên mật khẩu.',
          },
          companySso: {
            label: 'SSO công ty',
            text: 'Cho phép nhân viên đăng nhập qua nền tảng định danh của công ty bằng OIDC.\n\nGiữ đăng nhập bằng tài khoản-mật khẩu và thêm nút Tài khoản công ty.\nNút này mở nền tảng định danh của công ty. Sau khi đăng nhập thành công, quay về trang chủ của ứng dụng.\n\nCho phép lần đăng nhập đầu tiên tạo tài khoản ứng dụng, nhận diện theo mã người dùng ổn định của nền tảng.\nKhông tự động liên kết tài khoản theo tên hoặc email trùng. Tài khoản mới dùng quyền mặc định của ứng dụng.\n\nLiệt kê các thông tin quản trị viên nền tảng định danh cần cung cấp và URL callback họ cần đăng ký.',
          },
          apiKeys: {
            label: 'Khoá API',
            text: 'Thêm mục Khoá tích hợp vào menu người dùng, dùng khả năng API keys có sẵn của ứng dụng.\nNhân viên chỉ quản lý các khoá mình tạo, nhập mục đích và thời hạn hiệu lực theo ngày.\nChỉ hiển thị toàn bộ khoá một lần sau khi tạo, kèm lời nhắc sao chép và lưu lại ngay.\nLiệt kê tên, một đoạn nhận diện, trạng thái, hạn dùng và lần dùng gần nhất của mỗi khoá, cho phép thu hồi sau khi xác nhận.\nKhông bao giờ hiển thị toàn bộ khoá trong danh sách, nhật ký hay trang chi tiết.',
          },
        },
      },
      dataSources: {
        title: 'Nguồn dữ liệu',
        description:
          'Chọn cơ sở dữ liệu của ứng dụng và dùng dữ liệu nghiệp vụ từ các cơ sở dữ liệu bên ngoài sẵn có.',
        prompts: {
          postgres: {
            label: 'Đổi cơ sở dữ liệu',
            text: 'Chuyển cơ sở dữ liệu của ứng dụng từ SQLite sang PostgreSQL.\nĐọc thông tin kết nối từ cấu hình chạy của máy chủ, không ghi trong mã nguồn.\nGiải thích cần cài driver cơ sở dữ liệu nào và cần điền những cấu hình nào, đồng thời nhắc tôi rằng dữ liệu hiện có không được di chuyển tự động.',
          },
          externalDatabase: {
            label: 'CSDL bên ngoài',
            text: 'Kết nối cơ sở dữ liệu tài chính sẵn có của công ty làm nguồn dữ liệu bên ngoài chỉ đọc; không sửa đổi các bảng của nó.\nĐối chiếu bản ghi theo mã nhà cung cấp và thêm mục Thanh toán vào chi tiết nhà cung cấp, hiển thị chu kỳ thanh toán, hạn mức tín dụng và trạng thái thanh toán, ghi rõ nguồn dữ liệu.\nVẫn đọc thông tin liên hệ nhà cung cấp từ cơ sở dữ liệu của ứng dụng, và đọc dữ liệu thanh toán trực tiếp từ cơ sở dữ liệu bên ngoài mà không nhập vào.\nĐọc thông tin đăng nhập kết nối từ cấu hình chạy của máy chủ.',
          },
        },
      },
      authorization: {
        title: 'Phân quyền',
        description:
          'Kiểm soát ai được mở trang nào, thực hiện thao tác nào và xem bản ghi nào.',
        prompts: {
          jobs: {
            label: 'Chức danh',
            text: 'Tạo hai chức danh Người đề nghị mua hàng và Người duyệt đơn cho ứng dụng.\nNgười đề nghị mua hàng được vào trang đơn hàng và xem các đơn mình đề nghị.\nNgười duyệt đơn được vào trang đơn hàng, xem đơn và duyệt hoặc từ chối các đơn đang chờ.\nChỉ quản trị viên ứng dụng được thay đổi phân quyền và phân công.\nDùng khả năng phân quyền có sẵn của ứng dụng để quản trị viên có thể điều chỉnh quyền và phân công người sau này.',
          },
          dataScopes: {
            label: 'Phạm vi dữ liệu',
            text: 'Cho phép người đề nghị mua hàng chỉ xem đơn của chính mình, dựa vào trường người đề nghị của đơn để xác định chủ sở hữu.\nNgười duyệt đơn được xem mọi đơn và xử lý các đơn chờ duyệt.\nQuản trị viên có thể điều chỉnh phạm vi xem đơn của từng chức danh trong bộ quyền của chức danh đó.',
          },
          restrictions: {
            label: 'Hạn chế',
            text: 'Bob tạm thời hỗ trợ duyệt đơn mua hàng và chỉ được xem các đơn từ 2.000 trở xuống.\nThêm giới hạn số tiền vào thao tác Xem đơn hàng của anh ấy, giữ nguyên chức danh và phạm vi dữ liệu hiện có.\nÁp dụng giới hạn cho cả đơn của chính anh ấy và đơn được chia sẻ cho anh ấy.\nQuản trị viên có thể đổi số tiền hoặc gỡ quy tắc; trước khi gỡ, giải thích rằng phạm vi anh ấy nhìn thấy có thể mở rộng.',
          },
        },
      },
      workflow: {
        title: 'Quy trình',
        description:
          'Đưa hồ sơ nghiệp vụ qua từng giai đoạn, có chờ đợi, quá hạn, thử lại và lịch sử ai đã làm gì.',
        prompts: {
          stages: {
            label: 'Giai đoạn',
            text: 'Thêm quy trình cho đơn mua hàng: Chờ duyệt → Chờ mua → Đã nhận hàng → Hoàn tất.\nNgười duyệt duyệt hoặc từ chối; từ chối phải có lý do và trả đơn về người đề nghị để sửa và gửi lại.\nSau khi nhân viên mua hàng đặt mua, đơn ở trạng thái chờ mua; xác nhận giao hàng kèm biên nhận có chữ ký chuyển đơn sang Đã nhận hàng, và xác nhận của người đề nghị hoàn tất đơn.\nChi tiết đơn chỉ cung cấp thao tác của giai đoạn hiện tại, chỉnh sửa thông thường không thể đổi giai đoạn.\nKiểm tra giai đoạn và thông tin bắt buộc ở máy chủ, và không bao giờ ghi đè kết quả người khác đã gửi.',
          },
          backgroundExport: {
            label: 'Xuất nền',
            text: 'Thêm trang báo cáo đơn hàng để xuất các đơn hiện có ra CSV.\nSau khi gửi, yêu cầu xuất chờ xử lý, được tạo ở nền và hoàn tất kèm liên kết tải xuống.\nHiển thị giai đoạn hiện tại, tên tệp, số đơn đã xuất, cùng bản ghi gửi yêu cầu và xử lý của hệ thống.\nThử lại khi tạo thất bại theo quy tắc, và giữ lại lỗi cuối cùng để người phụ trách xử lý; chạy lại không được tạo trùng tệp báo cáo.\nGiữ tiến độ và kết quả sau khi tải lại trang, và chỉ cho phép người được cấp quyền xuất đơn hàng.',
          },
          history: {
            label: 'Lịch sử',
            text: 'Hiển thị giai đoạn hiện tại và lịch sử xử lý trong chi tiết đơn.\nMỗi mục hiển thị ai thực hiện, khi nào, thao tác gì, giai đoạn trước và sau, cùng lý do từ chối hoặc biên nhận có chữ ký nếu có.\nĐánh dấu các thao tác tự động là do hệ thống thực hiện.\nGiữ tiến độ và lịch sử sau khi tải lại trang, để có thể xem lại toàn bộ quy trình khi đã hoàn tất.',
          },
        },
      },
      scheduler: {
        title: 'Tác vụ định kỳ',
        description:
          'Chạy công việc nghiệp vụ vào thời điểm định sẵn, xem lần chạy kế tiếp và kết quả.',
        prompts: {
          reminder: {
            label: 'Nhắc nhở hằng ngày',
            text: 'Thêm Nhắc nhở đơn chờ duyệt vào ứng dụng đơn hàng hiện có.\n\nVào 09:00 giờ Việt Nam mỗi ngày làm việc, tìm các đơn đang chờ duyệt, nhóm theo người duyệt và gửi cho mỗi người duyệt một thông báo trong ứng dụng.\nGhi số đơn chờ duyệt và liên kết đến danh sách đơn chờ duyệt. Không gửi gì khi không có đơn chờ.\nQuản trị viên có thể xem lịch chạy và lịch sử thực thi, tạm dừng hoặc tiếp tục nhắc nhở.',
          },
          weeklyReport: {
            label: 'Báo cáo tuần',
            text: 'Vào 08:00 giờ Việt Nam mỗi thứ Hai, tạo báo cáo tổng hợp doanh số tuần trước và thông báo cho trưởng phòng kinh doanh.\nBao gồm doanh thu, số đơn và tổng theo khu vực. Quản trị viên có thể xem tác vụ và lịch sử thực thi.',
          },
        },
      },
      notification: {
        title: 'Thông báo',
        description:
          'Gửi tin nhắn trong ứng dụng, email hoặc tin nhắn bot nhóm khi có sự kiện xảy ra.',
        prompts: {
          inApp: {
            label: 'Tin trong ứng dụng',
            text: 'Thêm chức năng duyệt đơn hàng vào ứng dụng hiện tại và thông báo kết quả cho người đề nghị qua tin nhắn trong ứng dụng.\n\nĐơn hàng gồm số đơn, tên, người đề nghị, số tiền và trạng thái duyệt.\nNgười đề nghị xem được đơn của mình. Người duyệt xem được các đơn chờ duyệt và duyệt hoặc từ chối. Dùng lại chức năng đơn hàng và duyệt sẵn có nếu có.\n\nSau khi duyệt hoặc từ chối, chỉ gửi một tin nhắn trong ứng dụng cho người đề nghị của đơn.\nTiêu đề cho biết đơn được duyệt hay bị từ chối. Nội dung gồm số đơn, tên và kết quả duyệt.\nNhấn vào tin nhắn sẽ mở chi tiết đơn tương ứng.\nKhông gửi khi đơn còn chờ duyệt. Chỉ thông báo một lần cho cùng một kết quả duyệt.\nLỗi gửi thông báo không ảnh hưởng đến kết quả duyệt đã lưu.',
          },
          email: {
            label: 'Email',
            text: 'Thêm email vào thông báo duyệt đơn hiện có, dùng kênh email đã cấu hình của ứng dụng.\n\nSau khi đơn được duyệt hoặc từ chối, gửi kết quả đến email tài khoản của người đề nghị.\nGhi số đơn trong tiêu đề, tên đơn và kết quả trong nội dung.\nGiữ tin nhắn trong ứng dụng hiện có. Nếu người đề nghị không có email, chỉ gửi tin nhắn trong ứng dụng.\nLỗi gửi email không được ảnh hưởng đến kết quả duyệt hay tin nhắn trong ứng dụng.',
          },
        },
      },
      mail: {
        title: 'Thư điện tử',
        description:
          'Kết nối hộp thư cá nhân, rồi đọc, trả lời và gửi email công việc.',
        prompts: {
          providers: {
            label: 'Nhà cung cấp thư',
            text: 'Cấu hình mailbox.org cho ứng dụng trong mail.providers của cấu hình máy chủ:\n- Máy chủ nhận thư IMAP: imap.mailbox.org, cổng 993, SSL/TLS.\n- Máy chủ gửi thư SMTP: smtp.mailbox.org, cổng 465, SSL/TLS.\nNgười dùng tự nhập địa chỉ email, tên đăng nhập và mật khẩu trên trang tài khoản hộp thư và chọn ngày bắt đầu đồng bộ lần đầu; không bao giờ ghi mật khẩu hộp thư vào cấu hình hay mã nguồn.',
          },
          mailCenter: {
            label: 'Trung tâm thư',
            text: 'Thư điện tử đã có sẵn trong ứng dụng này; hãy dùng lại thay vì xây dựng lại hoặc cài plugin khác.\nThêm trang Trung tâm thư và Tài khoản hộp thư vào thanh điều hướng, dùng trang không gian thư và trang tài khoản hộp thư do khả năng thư cung cấp.\nNgười dùng có thể kết nối hộp thư của mình, đồng bộ thư đến, đọc thư và tệp đính kèm, và trả lời, giữ nguyên tiêu đề gốc và ngữ cảnh hội thoại, gửi trả lời cho người gửi ban đầu.\nMỗi người dùng làm việc với các hộp thư đã kết nối của riêng mình.',
          },
          correspondence: {
            label: 'Email khách hàng',
            text: 'Thêm mục thư từ vào chi tiết khách hàng, dùng lại các thành phần đọc và soạn thư có sẵn của ứng dụng.\nHiển thị các thư có người gửi hoặc người nhận khớp với địa chỉ email liên hệ của khách hàng hiện tại. Nhân viên kinh doanh có thể đọc thư, xem tệp đính kèm và trả lời bằng hộp thư đã kết nối của mình.',
          },
        },
      },
      file: {
        title: 'Tệp',
        description:
          'Tải tệp lên, đính kèm vào bản ghi, xem trước hoặc tải xuống.',
        prompts: {
          attachments: {
            label: 'Tệp đính kèm',
            text: 'Thêm tệp đính kèm mua hàng vào ứng dụng quản lý đơn hàng hiện có của tôi.\n\nThêm khu vực đính kèm vào chi tiết đơn. Mỗi đơn có thể có nhiều tệp, gồm PDF, hình ảnh và DOCX.\nHiển thị tên tệp và dung lượng, với thao tác xem trước, tải xuống và gỡ tệp đính kèm.\nSau khi tải lên, cho phép người dùng lưu tệp đính kèm vào đơn hiện tại. Giữ chúng khi mở lại đơn.\nAi có quyền truy cập đơn đều xem và tải được tệp đính kèm. Người đề nghị và người duyệt có thể thêm hoặc gỡ tệp đính kèm.\nGỡ tệp đính kèm chỉ bỏ liên kết với đơn hiện tại; vẫn giữ tệp.',
          },
          avatar: {
            label: 'Ảnh đại diện',
            text: 'Thêm ảnh đại diện cho mỗi nhân viên, mỗi người một ảnh.\nHỗ trợ tải lên và thay ảnh đại diện, hiển thị trong danh sách và chi tiết nhân viên.\nDùng ảnh mới sau khi thay và vẫn hiển thị sau khi tải lại trang.',
          },
        },
      },
      i18n: {
        title: 'Ngôn ngữ',
        description:
          'Chuyển ngôn ngữ giao diện, thêm ngôn ngữ và đặt ngôn ngữ mặc định.',
        prompts: {
          addLanguage: {
            label: 'Thêm ngôn ngữ',
            text: 'Thêm tiếng Tây Ban Nha vào ứng dụng của tôi. Dịch giao diện và thông báo của máy chủ, và thêm tiếng Tây Ban Nha vào menu ngôn ngữ.',
          },
          defaultLanguage: {
            label: 'Ngôn ngữ mặc định',
            text: 'Đặt tiếng Việt làm ngôn ngữ mặc định của ứng dụng cho những người chưa chọn ngôn ngữ. Giữ tiếng Anh trong menu ngôn ngữ.',
          },
        },
      },
      theme: {
        title: 'Giao diện',
        description:
          'Điều chỉnh màu sắc, phông chữ, mật độ hiển thị và chuyển giữa chế độ sáng và tối.',
        prompts: {
          changeTheme: {
            label: 'Sửa giao diện',
            text: 'Cập nhật giao diện Gọn: dùng màu xanh dương làm màu chính và tăng nhẹ độ bo góc. Giữ phông chữ, cỡ chữ và khoảng cách gọn hiện tại.',
          },
          newTheme: {
            label: 'Giao diện mới',
            text: 'Tạo giao diện Rừng xanh với màu chính là xanh lá, nền dịu, bo góc vừa phải và bóng đổ nhẹ.',
          },
        },
      },
    },
  },

  appearance: {
    title: 'Giao diện',
    mode: 'Chế độ màu',
    preset: 'Giao diện',
    light: 'Sáng',
    dark: 'Tối',
    system: 'Theo hệ thống',
    themes: { default: 'Rộng rãi', compact: 'Gọn' },
  },
  app: {
    title: 'NocoFin',
  },
  actions: {
    close: 'Đóng',
    save: 'Lưu',
    cancel: 'Huỷ',
    confirm: 'Xác nhận',
    language: 'Ngôn ngữ',
  },
  notices: {
    serverLocaleFallback:
      'Máy chủ không hỗ trợ ngôn ngữ này nên thông báo từ máy chủ sẽ dùng tiếng Anh.',
    languageChangeFailed: 'Không thể đổi ngôn ngữ. Vui lòng thử lại.',
  },
  account: {
    signOutFailed: 'Không thể đăng xuất. Vui lòng thử lại.',
    openMenu: 'Mở menu tài khoản',
    fallback: 'Tài khoản',
    signOut: 'Đăng xuất',
    signingOut: 'Đang đăng xuất…',
  },
  navigation: {
    resources: 'Tài liệu tham khảo',
    home: 'Trang chủ',
    open: 'Mở thanh điều hướng',
    close: 'Đóng thanh điều hướng',
    expand: 'Mở rộng thanh điều hướng',
    collapse: 'Thu gọn thanh điều hướng',
    toggle: 'Mở rộng hoặc thu gọn thanh điều hướng',
    label: 'Điều hướng ứng dụng',
    description: 'Đi đến một trang của ứng dụng này.',
    breadcrumb: 'Đường dẫn',
    breadcrumbMore: 'Hiện các cấp ở giữa',
    back: 'Quay lại',
    backTo: 'Quay lại {{label}}',
  },
  dataTable: {
    noResults: 'Không có kết quả',
    sortAscending: 'Tăng dần',
    sortDescending: 'Giảm dần',
    sort: 'Sắp xếp',
    sortBy: 'Sắp xếp theo',
    filters: 'Bộ lọc',
    filtersApplied: 'Bộ lọc · {{count}}',
    selectPage: 'Chọn tất cả trên trang này',
    hideColumn: 'Ẩn',
    view: 'Hiển thị',
    toggleColumns: 'Ẩn/hiện cột',
    selectedCount: 'Đã chọn {{selected}} / {{total}} dòng.',
    rowsPerPage: 'Số dòng mỗi trang',
    pageOf: 'Trang {{page}} / {{pageCount}}',
    firstPage: 'Đến trang đầu',
    previousPage: 'Đến trang trước',
    nextPage: 'Đến trang sau',
    lastPage: 'Đến trang cuối',
  },
  datePicker: {
    placeholder: 'Chọn ngày',
    rangePlaceholder: 'Chọn khoảng ngày',
    clear: 'Xoá',
  },
};

export default systemViVN;
