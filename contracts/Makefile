.PHONY: build test clean coverage deploy-local deploy-testnet format lint

# 默认目标
all: build

# 编译合约
build:
	forge build

# 运行测试
test:
	forge test

# 运行测试并显示详细输出
test-verbose:
	forge test -vv

# 生成测试覆盖率报告
coverage:
	forge coverage

# 格式化代码
format:
	forge fmt

# 代码检查
lint:
	forge --check

# 清理构建文件
clean:
	rm -rf out cache broadcast

# 启动本地节点并部署
deploy-local:
	@echo "Starting local deployment..."
	anvil &
	sleep 2
	forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast

# 部署到 Monad Testnet
deploy-testnet:
	@echo "Deploying to Monad Testnet..."
	@if [ -z "$$PRIVATE_KEY" ]; then \
		echo "Error: PRIVATE_KEY environment variable is not set"; \
		exit 1; \
	fi
	forge script script/Deploy.s.sol \
		--rpc-url https://testnet-rpc.monad.xyz \
		--broadcast \
		--verify

# 运行特定测试
test-function:
	@read -p "Enter test function name: " test_name; \
	forge test --match-test $$test_name -vv

# 查看合约 gas 报告
gas-report:
	forge test --gas-report

# 帮助信息
help:
	@echo "Available targets:"
	@echo "  make build          - Compile contracts"
	@echo "  make test           - Run tests"
	@echo "  make test-verbose   - Run tests with verbose output"
	@echo "  make coverage       - Generate test coverage report"
	@echo "  make format         - Format code"
	@echo "  make lint           - Check code style"
	@echo "  make clean          - Clean build artifacts"
	@echo "  make deploy-local   - Deploy to local node"
	@echo "  make deploy-testnet - Deploy to Monad Testnet"
	@echo "  make test-function  - Run specific test"
	@echo "  make gas-report     - Show gas usage report"
	@echo "  make help          - Show this help message"
