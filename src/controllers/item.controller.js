import mongoose from "mongoose";
import { Item } from "../models/item.model.js";

export async function createItem(req, res, next) {
  try {
    const { name, description } = req.body || {};
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "name is required" });
    }
    const item = await Item.create({ name: name.trim(), description: description || "" });
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
}

export async function listItems(req, res, next) {
  try {
    const items = await Item.find().sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    next(e);
  }
}

export async function getItem(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "invalid id" });
    }
    const item = await Item.findById(id).lean();
    if (!item) {
      return res.status(404).json({ message: "not found" });
    }
    res.json(item);
  } catch (e) {
    next(e);
  }
}

export async function updateItem(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "invalid id" });
    }
    const updates = {};
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "name")) {
      const n = req.body.name;
      if (typeof n !== "string" || !n.trim()) {
        return res.status(400).json({ message: "name must be non-empty string" });
      }
      updates.name = n.trim();
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "description")) {
      updates.description = req.body.description || "";
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "no updates provided" });
    }
    const item = await Item.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true }).lean();
    if (!item) {
      return res.status(404).json({ message: "not found" });
    }
    res.json(item);
  } catch (e) {
    next(e);
  }
}

export async function deleteItem(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "invalid id" });
    }
    const item = await Item.findByIdAndDelete(id).lean();
    if (!item) {
      return res.status(404).json({ message: "not found" });
    }
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
