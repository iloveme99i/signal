import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("Signal first-round MVP keeps the complete capture and source flow", async () => {
  const [workspace, api, layout] = await Promise.all([
    readFile(new URL("app/signal-workspace.tsx", root), "utf8"),
    readFile(new URL("app/api/analyze/route.ts", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
  ]);

  assert.match(workspace, /粘贴备忘录/);
  assert.match(workspace, /上传截图/);
  assert.match(workspace, /整理并分类/);
  assert.match(workspace, /数据来源/);
  assert.match(workspace, /signal-deepseek-key/);
  assert.match(workspace, /signal-items/);
  assert.match(workspace, /signal-sources/);
  assert.match(workspace, /signal-categories/);
  assert.match(api, /默认把一份材料整理成一条/);
  assert.match(api, /不能因此被拆成多条/);
  assert.match(layout, /Signal｜信息识别与分类/);
});

test("Signal provides a user-created nested classification tree and working item actions", async () => {
  const workspace = await readFile(new URL("app/signal-workspace.tsx", root), "utf8");
  for (const label of ["求职", "岗位", "产品实习", "学习", "AI", "项目", "收藏", "置顶", "看板", "备忘录", "回收站"]) {
    assert.match(workspace, new RegExp(label));
  }
  assert.match(workspace, /addCategory/);
  assert.match(workspace, /finishCategoryEdit/);
  assert.match(workspace, /deleteCategory/);
  assert.match(workspace, /dropIntoCategory/);
  assert.match(workspace, /彻底删除/);
  assert.doesNotMatch(workspace, /模型设置/);
  assert.doesNotMatch(workspace, /事务-时间|事务-执行|项目-资料/);
});
