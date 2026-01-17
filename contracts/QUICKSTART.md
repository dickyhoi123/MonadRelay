# Foundry 快速入门指南

## 1. 安装 Foundry

如果您还没有安装 Foundry，请运行以下命令：

```bash
curl -L https://foundry.paradigm.xyz | bash
source ~/.bashrc
foundryup
```

## 2. 快速开始

### 2.1 编译合约

```bash
make build
```

或使用 forge 命令：

```bash
forge build
```

### 2.2 运行测试

```bash
make test
```

或使用 forge 命令：

```bash
forge test
```

### 2.3 查看测试详情

```bash
make test-verbose
```

或使用 forge 命令：

```bash
forge test -vv
```

## 3. 部署合约

### 3.1 本地部署

首先，在一个终端中启动本地节点：

```bash
anvil
```

然后在另一个终端中部署合约：

```bash
make deploy-local
```

### 3.2 部署到 Monad Testnet

设置环境变量：

```bash
# 从 .env.example 复制并填写您的私钥
cp .env.example .env

# 编辑 .env 文件，设置您的私钥和 RPC URL
# PRIVATE_KEY=your_private_key_here
# RPC_URL=https://testnet-rpc.monad.xyz
```

部署合约：

```bash
make deploy-testnet
```

## 4. 测试命令

### 4.1 运行所有测试

```bash
forge test
```

### 4.2 运行特定测试

```bash
forge test --match-test testFullSessionFlow -vv
```

### 4.3 查看测试覆盖率

```bash
make coverage
```

### 4.4 查看气体报告

```bash
make gas-report
```

## 5. 常用命令

### 5.1 编译和测试

```bash
# 编译
forge build

# 运行测试
forge test

# 编译并测试
forge build && forge test
```

### 5.2 调试

```bash
# 详细模式
forge test -vvvv

# 调试特定测试
forge test --match-test testFullSessionFlow --debug

# 打印调试信息
forge test --debug "testFullSessionFlow()"
```

### 5.3 交互式调试

启动 chisel 进行交互式调试：

```bash
chisel
```

在 Chisel 中，您可以：
- 部署合约
- 调用函数
- 检查状态
- 执行脚本

## 6. 代码格式化和检查

```bash
# 格式化代码
make format

# 检查代码风格
make lint

# 清理构建文件
make clean
```

## 7. 使用 Makefile

所有常用命令都可以通过 Makefile 运行：

```bash
make help
```

可用命令：
- `make build` - 编译合约
- `make test` - 运行测试
- `make test-verbose` - 运行测试并显示详细输出
- `make coverage` - 生成测试覆盖率报告
- `make format` - 格式化代码
- `make lint` - 检查代码风格
- `make clean` - 清理构建文件
- `make deploy-local` - 部署到本地节点
- `make deploy-testnet` - 部署到 Monad Testnet
- `make test-function` - 运行特定测试
- `make gas-report` - 显示气体使用报告

## 8. 常见问题

### 8.1 合约编译失败

检查 Solidity 版本和依赖是否正确安装：

```bash
forge build
```

### 8.2 测试失败

使用详细模式查看错误信息：

```bash
forge test -vvvv
```

### 8.3 部署失败

检查环境变量是否正确设置：

```bash
echo $PRIVATE_KEY
echo $RPC_URL
```

### 8.4 Gas 不足

增加 gas limit 或调整 gas price：

```bash
forge script script/Deploy.s.sol \
  --rpc-url $RPC_URL \
  --broadcast \
  --gas-price 1000000000 \
  --gas-limit 50000000
```

## 9. 进一步学习

- [Foundry 官方文档](https://book.getfoundry.sh/)
- [Solidity 文档](https://docs.soliditylang.org/)
- [OpenZeppelin 合约](https://docs.openzeppelin.com/contracts/)

## 10. 贡献

欢迎贡献！请遵循以下步骤：

1. 创建新分支
2. 进行修改
3. 运行测试：`make test`
4. 提交 Pull Request

## 11. 联系方式

如有问题，请：
- 查看项目文档
- 提交 Issue
- 查看 README.md

---

**Happy Coding! 🚀**
