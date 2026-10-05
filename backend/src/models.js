import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const oid = (ref) => ({ type: Schema.Types.ObjectId, ref });

export const User = model('User', new Schema({
  name: String, email: { type: String, unique: true, lowercase: true }, password: String,
  verified: { type: Boolean, default: false }, verifyToken: String, resetToken: String, resetExp: Date,
}, { timestamps: true }));
export const Workspace = model('Workspace', new Schema({ name: String, owner: oid('User') }, { timestamps: true }));
export const Membership = model('Membership', new Schema({
  user: oid('User'), workspace: oid('Workspace'), role: { type: String, enum: ['owner', 'editor', 'viewer'] },
}, { timestamps: true }));
export const Invite = model('Invite', new Schema({
  workspace: oid('Workspace'), token: { type: String, unique: true }, role: String, expires: Date,
}));
export const Location = model('Location', new Schema({ workspace: oid('Workspace'), name: String, createdBy: oid('User') }, { timestamps: true }));
export const Scan = model('Scan', new Schema({
  workspace: oid('Workspace'), location: oid('Location'), savedBy: oid('User'),
  url: String, score: Number, checks: Array, banner: Schema.Types.Mixed, policies: Schema.Types.Mixed,
  cookies: Schema.Types.Mixed, trackers: [String], screenshot: String, scannedAt: Date,
}, { timestamps: true }));
export const Contact = model('Contact', new Schema({ name: String, email: String, message: String }, { timestamps: true }));
export const Task = model('Task', new Schema({
  workspace: oid('Workspace'), number: Number, title: String,
  status: { type: String, enum: ['todo', 'progress', 'done'], default: 'todo' },
  assignee: oid('User'), createdBy: oid('User'),
}, { timestamps: true }));