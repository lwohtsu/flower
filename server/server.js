//コレクション作成

Projects = new Mongo.Collection("projects");
Tasks = new Mongo.Collection("tasks");
//バーチャルズは架空のユーザー。プロジェクト管理に参加しないユーザーやクライアントとなります。
Virtuals = new Mongo.Collection('virtuals');