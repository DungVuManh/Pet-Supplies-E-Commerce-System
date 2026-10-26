import { Setting } from "../models/setting.model.js";
import { Product } from "../models/product.model.js";
import { parseInventoryQuery } from "../validators/inventory.validator.js";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listInventory(request, response, next) {
  try {
    const { query, status, page, pageSize } = parseInventoryQuery(
      request.query,
    );

    const setting = await Setting.findById("global").lean();
    const threshold = setting?.lowStockThreshold ?? 20;

    const pipeline = [
      { $unwind: "$variants" },
      {
        $set: {
          available: {
            $subtract: [
              { $ifNull: ["$variants.stock", 0] },
              { $ifNull: ["$variants.reservedStock", 0] },
            ],
          },
        },
      },
      {
        $set: {
          stockStatus: {
            $switch: {
              branches: [
                {
                  case: { $lte: ["$available", 0] },
                  then: "out",
                },
                {
                  case: { $lte: ["$available", threshold] },
                  then: "low",
                },
              ],
              default: "available",
            },
          },
        },
      },
    ];

    if (query) {
      pipeline.push({
        $match: {
          name: {
            $regex: escapeRegex(query),
            $options: "i",
          },
        },
      });
    }

    if (status !== "all") {
      pipeline.push({
        $match: { stockStatus: status },
      });
    }

    pipeline.push({
      $facet: {
        items: [
          { $sort: { name: 1, "variants.sku": 1 } },
          { $skip: (page - 1) * pageSize },
          { $limit: pageSize },
          {
            $project: {
              _id: 0,
              sku: "$variants.sku",
              name: 1,
              available: 1,
              status: "$stockStatus",
            },
          },
        ],
        total: [{ $count: "count" }],
      },
    });

    const [result] = await Product.aggregate(pipeline);

    const total = result?.total?.[0]?.count ?? 0;

    return response.json({
      success: true,
      data: {
        items: result?.items ?? [],
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
