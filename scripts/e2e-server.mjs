import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
const user = { id: 'test-admin', email: 'test@example.test', fullName: 'Test operator', role: { id: 'admin', name: 'Administrator', permissions: ['customers.read','customers.write','users.read','users.write','inventory.read','sales.read','purchase.read','dashboard.read','reports.read','locations.read','bank.read','credit.read','expense.read','bom.read','production.read','stock_transfer.read','stocktake.read','inquiries.read','roles.read','settings.read','profit_loss.read','notifications.read','messages.read','messages.write'] } };
const customers = [{ id: 'customer-a', name: 'Acacia Studio', email: 'hello@acacia.test', isActive: true }, { id: 'customer-b', name: 'Birch Workshop', email: 'hello@birch.test', isActive: true }, { id: 'customer-c', name: 'Cedar House', email: 'hello@cedar.test', isActive: true }];
const token = 'e30.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url') + '.test';
const server = createServer(async (req, res) => {
  let body = ''; for await (const chunk of req) body += chunk;
  const path = new URL(req.url, 'http://localhost').pathname.replace('/api/v1','');
  res.setHeader('content-type','application/json');
  let result = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } };
  if (path === '/auth/login' || path === '/auth/refresh') result = { user, accessToken: token, refreshToken: token };
  else if (path === '/auth/me') { if (!req.headers.authorization) { res.statusCode = 401; result = { message: 'Unauthorized' }; } else result = user; }
  else if (path === '/dashboard') result = { totalInventoryValue: '12000', stockValueByLocation: [], showroomCount: 0, dailySales: '0', dailyPurchases: '0', profitAndLoss: { revenue:'0', costOfGoodsSold:'0', grossProfit:'0', totalExpenses:'0', netProfit:'0', marginPercent:'0' }, financialOverview: { cashTotal:'0', bankTotal:'0', totalLiquidity:'0', bankAccounts:[] } };
  else if (path.includes('unread-count')) result = { count: 0 };
  else if (path === '/health/live') result = { status: 'ok', currency: { code: 'ETB', symbol: 'Br' } };
  else if (path === '/customers') result = { data: customers, meta: { page: 1, limit: 20, total: customers.length, totalPages: 1 } };
  else if (path.startsWith('/customers/') && req.method === 'PATCH') {
    const customer = customers.find(c => c.id === path.split('/').pop());
    if (customer?.id === 'customer-b' && JSON.parse(body).isActive === false) { res.statusCode = 409; result = { message: 'Customer has open documents' }; }
    else { Object.assign(customer ?? {}, JSON.parse(body)); result = customer; }
  }
  res.end(JSON.stringify(result));
});
server.listen(4321, '127.0.0.1');
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--webpack','-p','3123'], {
  stdio: 'inherit', env: { ...process.env, NODE_ENV: 'development', API_URL: 'http://127.0.0.1:4321/api/v1', NEXT_PUBLIC_API_URL: 'http://127.0.0.1:4321/api/v1' }, windowsHide: true,
});
function stop() { child.kill(); server.close(); }
process.on('SIGTERM', stop); process.on('SIGINT', stop);
child.on('exit', code => { server.close(); process.exit(code ?? 0); });
