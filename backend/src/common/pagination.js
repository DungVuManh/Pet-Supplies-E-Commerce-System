/** Response shape shared by every paged Admin list. */
export function pageDto(items, total, { page, pageSize }) {
 return {
  items,
  pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
 };
}

/**
 * Runs one page of `Model.find(filter)` and its total count in parallel.
 * `query` carries `page`/`pageSize` from `listQuerySchema`; `sort` defaults to newest first.
 */
export async function paginate(Model, filter, query, { sort = { createdAt: -1, _id: -1 }, select } = {}) {
 const { page, pageSize } = query;
 let find = Model.find(filter).sort(sort).skip((page - 1) * pageSize).limit(pageSize);
 if (select) find = find.select(select);
 const [items, total] = await Promise.all([find.lean(), Model.countDocuments(filter)]);
 return pageDto(items, total, query);
}
