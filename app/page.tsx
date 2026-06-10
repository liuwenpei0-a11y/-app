"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FeishuItem {
  record_id?: string;
  Name: string;
  Price: number;
  PurchaseDate: number;
  CurrentValue: number;
}

export default function Page() {
  const [items, setItems] = useState<FeishuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

  // New Item Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDate, setNewDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  useEffect(() => {
    checkSetup();
  }, []);

  async function checkSetup() {
    try {
      const res = await fetch("/api/setup");
      const data = await res.json();
      setIsConfigured(data.configured);
      if (data.configured) {
        fetchItems();
      } else {
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  async function fetchItems() {
    try {
      const res = await fetch("/api/items");
      if (res.ok) {
        const data = await res.json();
        const sortedItems = (data.items || []).sort(
          (a: FeishuItem, b: FeishuItem) => b.PurchaseDate - a.PurchaseDate
        );
        setItems(sortedItems);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newName || !newPrice) return;

    try {
      const purchaseMs = new Date(`${newDate}T00:00:00`).getTime();
      
      const payload = {
        Name: newName,
        Price: parseFloat(newPrice),
        PurchaseDate: purchaseMs,
        CurrentValue: 0,
      };

      const optimisticItem = { ...payload, record_id: "optimistic-" + Date.now() };
      setItems([optimisticItem, ...items]);
      setShowAddForm(false);
      setNewName("");
      setNewPrice("");

      await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      fetchItems();
    } catch (e) {
      console.error(e);
    }
  }

  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>("");

  async function handleUpdateValue(recordId: string, newValue: number) {
    if (!recordId || recordId.startsWith("optimistic")) return;

    setItems((prev) =>
      prev.map((i) =>
        i.record_id === recordId ? { ...i, CurrentValue: newValue } : i
      )
    );
    setEditingValueId(null);

    try {
      await fetch(`/api/items/${recordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ CurrentValue: newValue }),
      });
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDelete(recordId: string) {
    if (!recordId || recordId.startsWith("optimistic")) return;
    
    setItems((prev) => prev.filter((i) => i.record_id !== recordId));

    try {
      await fetch(`/api/items/${recordId}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.error(e);
    }
  }

  const getDaysOwned = (purchaseMs: number) => {
    const diffTime = Math.abs(Date.now() - purchaseMs);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  };

  const getRealCostPerDay = (price: number, currentValue: number, daysOwned: number) => {
    const netCost = Math.max(0, price - currentValue);
    return (netCost / daysOwned).toFixed(2);
  };

  const getRetentionRate = (price: number, currentValue: number) => {
    if (price === 0) return "0%";
    return ((currentValue / price) * 100).toFixed(1) + "%";
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="animate-pulse flex items-center gap-2 text-slate-400 font-mono text-sm">
          <span>加载中 / Loading</span>
          <div className="h-1 w-1 bg-slate-400 rounded-full animate-bounce delay-75"></div>
          <div className="h-1 w-1 bg-slate-400 rounded-full animate-bounce delay-150"></div>
          <div className="h-1 w-1 bg-slate-400 rounded-full animate-bounce delay-300"></div>
        </div>
      </div>
    );
  }

  if (isConfigured === false) {
    return <SetupGuide />;
  }

  return (
    <main className="max-w-2xl mx-auto w-full p-4 sm:p-8 flex flex-col gap-8 pb-24">
      {/* Header Section */}
      <header className="flex items-end justify-between pt-8 sm:pt-12 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-slate-900 mb-1">
            断舍离 <span className="text-slate-400 font-light tracking-normal text-xl ml-2">理性消费</span>
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-2 tracking-tight">
            价值 = 价格 ÷ 频次与时间
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center p-2 rounded-full hover:bg-slate-200 text-slate-900 transition-colors"
        >
          <Plus
            className={`w-6 h-6 transition-transform duration-300 ${
              showAddForm ? "rotate-45" : ""
            }`}
          />
        </button>
      </header>

      {/* Add Item Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.form
            initial={{ opacity: 0, height: 0, overflow: "hidden" }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAddItem}
            className="flex flex-col gap-4 bg-white p-6 border border-slate-200 shadow-sm rounded-2xl"
          >
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">
                物品名称
              </label>
              <input
                autoFocus
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例如：MacBook Pro, 咖啡机..."
                className="w-full bg-slate-50 text-slate-900 p-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all font-display"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">
                  购买价格
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400">¥</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 text-slate-900 p-3 pl-8 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all font-display"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">
                  购买日期
                </label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 p-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all font-display appearance-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!newName || !newPrice}
              className="mt-2 w-full bg-slate-900 text-white rounded-lg p-3 font-medium flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              添加物品 (Add Item)
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Stats Summary Panel */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">总支出</span>
            <span className="text-2xl font-display tracking-tight text-slate-900 truncate">
              ¥{items.reduce((acc, item) => acc + item.Price, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">总残值</span>
            <span className="text-2xl font-display tracking-tight text-slate-900 truncate">
              ¥{items.reduce((acc, item) => acc + (item.CurrentValue || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm flex flex-col gap-1 col-span-2 sm:col-span-1">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">持有物品总数</span>
            <span className="text-2xl font-display tracking-tight text-slate-900">
              {items.length} 件
            </span>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="flex flex-col gap-6 w-full">
        <AnimatePresence>
          {items.map((item) => {
            const daysOwned = getDaysOwned(item.PurchaseDate);
            const rDate = new Date(item.PurchaseDate);
            const dateString = isNaN(rDate.getTime()) ? "Unknown" : rDate.toLocaleDateString();

            return (
              <motion.div
                key={item.record_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group relative bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300"
              >
                {/* Delete Button */}
                <button
                  onClick={() => handleDelete(item.record_id as string)}
                  className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors sm:opacity-0 sm:group-hover:opacity-100 p-2 -mr-2 -mt-2"
                  title="删除该记录"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex flex-col sm:flex-row justify-between gap-6">
                  {/* Left Col: Info */}
                  <div className="flex flex-col justify-between flex-1 pr-6">
                    <div className="flex items-baseline gap-2 mb-1">
                      <h3 className="text-xl font-medium tracking-tight text-slate-900 line-clamp-1">
                        {item.Name}
                      </h3>
                    </div>
                    <div className="text-xs text-slate-500 font-mono tracking-tight flex items-center gap-1.5 flex-wrap">
                      <span>¥{item.Price.toLocaleString()}</span>
                      <span className="text-slate-300">•</span>
                      <span>{dateString}</span>
                      <span className="text-slate-300">•</span>
                      <span>已持有 {daysOwned} 天</span>
                    </div>

                    <div className="mt-4 sm:mt-6 hidden sm:block">
                      {editingValueId === item.record_id ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            step="0.01"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            placeholder="输入当前残值"
                            className="bg-slate-50 text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 font-display text-sm w-32"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateValue(item.record_id as string, parseFloat(tempValue) || 0)}
                            className="text-xs font-medium bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => setEditingValueId(null)}
                            className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingValueId(item.record_id || null);
                            setTempValue(item.CurrentValue.toString());
                          }}
                          className="inline-flex items-center gap-2 py-1.5 px-3 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-100 hover:border-slate-300 transition-all active:scale-95"
                        >
                          更新估值(残值)
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Col: Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-1 gap-4 sm:gap-3 sm:min-w-[150px] text-left sm:text-right sm:pr-8">
                    <div className="flex flex-col justify-end">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-0.5">
                        实际日均成本
                      </span>
                      <span className="text-lg font-display text-slate-800 font-medium tracking-tight">
                        ¥{getRealCostPerDay(item.Price, item.CurrentValue, daysOwned)}
                      </span>
                    </div>
                    <div className="flex flex-col justify-end">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-0.5">
                        当前保值率
                      </span>
                      <div className="flex items-center justify-start sm:justify-end gap-2">
                        <span className="text-lg font-display text-slate-800 font-medium tracking-tight">
                          {getRetentionRate(item.Price, item.CurrentValue)}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                          估值 ¥{item.CurrentValue}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile action button */}
                <div className="mt-5 pt-4 border-t border-slate-100 w-full flex flex-col sm:hidden">
                  {editingValueId === item.record_id ? (
                    <div className="flex items-center gap-2 w-full">
                      <input 
                        type="number" 
                        step="0.01"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        placeholder="输入当前残值"
                        className="bg-slate-50 text-slate-900 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 flex-1 font-display text-sm"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdateValue(item.record_id as string, parseFloat(tempValue) || 0)}
                        className="text-xs font-medium bg-slate-900 text-white px-4 py-2 rounded-lg"
                      >
                        保存
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium tracking-tight">日成本 = (原价 - 估值) ÷ 天数</span>
                      <button
                        onClick={() => {
                          setEditingValueId(item.record_id || null);
                          setTempValue(item.CurrentValue.toString());
                        }}
                        className="text-xs font-medium text-slate-700 bg-slate-100 px-3 py-1.5 rounded-md active:scale-95"
                      >
                        更新估值
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {items.length === 0 && !showAddForm && (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 border rounded-full border-slate-200 flex items-center justify-center text-slate-300 mb-4 bg-white shadow-sm cursor-pointer hover:bg-slate-50" onClick={() => setShowAddForm(true)}>
              <Plus className="w-6 h-6" />
            </div>
            <p className="text-slate-500 text-sm">暂无物品记录</p>
            <p className="text-slate-400 text-sm font-light mt-1">
              添加第一件物品，开启理性的断舍离生活。
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

// Sub-component to guide user when Feishu keys are missing
function SetupGuide() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 py-12">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-10">
        <div className="inline-flex items-center justify-center px-3 py-1 bg-amber-50 text-amber-700 font-mono text-xs font-bold tracking-widest uppercase rounded-full mb-6">
          第一步：配置数据库环境
        </div>
        <h1 className="text-2xl font-medium tracking-tight text-slate-900 mb-4">
          绑定您的“飞书多维表格”
        </h1>
        <p className="text-slate-600 leading-relaxed mb-6 text-sm">
          这个极简消费追踪器将使用<strong>免费的飞书多维表格 (Bitable)</strong> 作为云端数据库。这样你不仅可以在手机/电脑多端同步随时记录，还可以在飞书里直观管理你的数据。
        </p>

        <div className="flex flex-col gap-6">
          {/* Step 1 */}
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-3 flex gap-2 items-center">
              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">1</span>
              获取飞书应用凭证 (App ID & Secret)
            </h3>
            <div className="text-sm text-slate-600 mb-3 space-y-2">
              <p>1. 登录 <a href="https://open.feishu.cn/app" target="_blank" className="text-blue-500 hover:underline">飞书开发者后台</a>，点击“创建企业自建应用”。</p>
              <p>2. 在左侧菜单栏选择“凭证与基础信息”，这里你可以找到 <strong>App ID</strong> 和 <strong>App Secret</strong>。</p>
              <p>3. <strong className="text-red-500">关键步骤：</strong>在左侧“开发配置”-&gt;“权限管理”中，搜索“多维表格”，开通读取、更新等多维表格读写相关权限。然后进入“应用发布”-&gt;“版本管理与发布”去创建一个版本并发布该应用。</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-3 flex gap-2 items-center">
              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">2</span>
              新建表格并获取 Token & Table ID
            </h3>
            <div className="text-sm text-slate-600 mb-3 space-y-2">
              <p>1. 单独在飞书客户端或网页版中，新建一个空的“多维表格”。</p>
              <p>2. 在浏览器中打开这个表格，观察网页顶部的网址（URL），格式如下：<br/>
                 <code className="text-[11px] bg-slate-200 text-slate-800 p-1.5 rounded break-all mt-1 inline-block border border-slate-300">https://xxxx.feishu.cn/base/<span className="text-blue-600 font-bold">【这里是 App Token】</span>?table=<span className="text-red-600 font-bold">【这里是 Table ID】</span></code>
              </p>
              <p>（注：App Token 通常以 <code>bas</code> 开头；Table ID 通常以 <code>tbl</code> 开头）</p>
              <p>3. <strong className="text-red-500">极重要：</strong>在刚建好的多维表格右上角点“添加协作者”或“共享”，搜索你在第一步中创建的<strong>企业自建应用名称</strong>，把它邀为“可编辑”身份（应用必须有该表权限才能读写）。</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-3 flex gap-2 items-center">
              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">3</span>
              设置多维表格的列名 (Schema)
            </h3>
            <p className="text-sm text-slate-600 mb-3">为表格配置<strong>完全一致</strong>的字段名称和字段类型（不需要的其他列可直接在飞书里删掉）：</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between p-2.5 bg-white rounded border border-slate-200 shadow-sm"><span className="font-mono font-bold">Name</span><span className="text-slate-500 text-[11px] mt-0.5">多行文本 (Text)</span></div>
              <div className="flex justify-between p-2.5 bg-white rounded border border-slate-200 shadow-sm"><span className="font-mono font-bold">Price</span><span className="text-slate-500 text-[11px] mt-0.5">数字 (Number)</span></div>
              <div className="flex justify-between p-2.5 bg-white rounded border border-slate-200 shadow-sm"><span className="font-mono font-bold">PurchaseDate</span><span className="text-slate-500 text-[11px] mt-0.5 flex flex-col items-end">数字 (Number)<span className="text-[9px] text-slate-400">将用来存时间戳</span></span></div>
              <div className="flex justify-between p-2.5 bg-white rounded border border-slate-200 shadow-sm"><span className="font-mono font-bold">CurrentValue</span><span className="text-slate-500 text-[11px] mt-0.5">数字 (Number)</span></div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-3 flex gap-2 items-center">
              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-800 text-white text-xs font-bold">4</span>
              填入项目私密设置
            </h3>
            <p className="text-sm text-slate-600 mb-3">点击 AI Studio 界面平台设置里的 <strong>Secrets</strong> 面板（或者你在部署环境中的环境变量），将你获取到的四个值分别填入：</p>
            <ul className="text-sm font-mono text-slate-800 flex flex-col gap-2 bg-white p-3 rounded border border-slate-200">
              <li>FEISHU_APP_ID</li>
              <li>FEISHU_APP_SECRET</li>
              <li>FEISHU_APP_TOKEN</li>
              <li>FEISHU_TABLE_ID</li>
            </ul>
          </div>
        </div>

        <button 
          onClick={() => window.location.reload()}
          className="mt-8 w-full py-4 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          环境变量配置完成后，刷新页面
        </button>
      </div>
    </div>
  );
}
