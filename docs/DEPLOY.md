# 启动命令参考

## 1. 本地开发

```bash
# 安装依赖
npm install

# 复制环境变量
cp .env.example .env.local

# 初始化数据库（创建表 + 初始数据）
npm run db:push
npm run db:seed

# 启动开发服务器
npm run dev
```

访问地址：http://localhost:3000

初始管理员账号：
- 手机号：13800138000
- 密码：admin123

## 2. Docker 部署（推荐用于生产，不间断服务）

```bash
# 1. 复制环境变量
cp .env.example .env
# 然后编辑 .env 修改 NEXTAUTH_SECRET、管理员密码等

# 2. 构建并启动
docker compose up -d --build

# 3. 查看日志
docker compose logs -f

# 4. 停止
docker compose down

# 5. 重新构建（代码更新后）
docker compose up -d --build
```

> Docker 容器配置了 `restart: always`，服务器重启或进程崩溃都会自动重启，保证 7x24 不间断服务。
> SQLite 数据库文件挂载在宿主机 `./prisma/data/` 目录，容器重建不会丢失数据。

## 3. 运行定价算法测试

```bash
npm run test
```

该测试会验证 PRD 中提到的所有价格计算场景，确保定价逻辑正确。
