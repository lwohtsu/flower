//コレクション作成

Projects = new Mongo.Collection("projects");
Tasks = new Mongo.Collection("tasks");
//バーチャルズは架空のユーザー。プロジェクト管理に参加しないユーザーやクライアントとなります。
Virtuals = new Mongo.Collection('virtuals');

Meteor.publish("virtuals", function () {
	return Virtuals.find({});
});

Meteor.publish("projects", function(){
	//現在のユーザーが参加しているプロジェクトのみパブリッシュする
	return Projects.find({'urs': this.userId });
});
Meteor.publish("tasks", function(){
	return Tasks.find({});
});

Meteor.methods({

	//新規プロジェクトを追加
	addNewProject: function(){
		//セキュリティチェック
		if (! Meteor.userId()) throw new Meteor.Error("not-authorized");

		//新規プロジェクトを登録　名前はダミー、ユーザーは配列でカレントユーザーを登録
		var newprojid = Projects.insert({
			nm: 'new project name',	//プロジェクト名
			urs:[Meteor.userId()],	//ユーザーリスト
			create: new Date()
		});
		//新規タスク挿入
		Tasks.insert({
			prid: newprojid,		//親プロジェクト
			mbr: true,				//マスターブランチかどうか
			str: true,				//スタートタスクかどうか
			ti: 'first task title',	//タスクタイトル
			us: Meteor.userId(),	//担当ユーザー
			dl: new Date(),			//デッドライン
			//ctsk 					//子タスク
			brch: [],				//ブランチ（初期値は空）
			create: new Date()
		});
	},
	//新規タスクを追加
	addNewTask: function(projectid, parentid, ismbr){
		//セキュリティチェック
		if (! Meteor.userId()) throw new Meteor.Error("not-authorized");
		var newtaskid = Tasks.insert({
			prid: projectid,		//親プロジェクト
			mbr: ismbr,				//マスターブランチかどうか
			str: true,				//スタートタスクかどうか
			ti: 'new task title',	//タスクタイトル
			us: Meteor.userId(),	//担当ユーザー
			dl: new Date(),			//デッドライン
			//ctsk 					//子タスク
			brch: [],				//ブランチ（初期値は空）
			create: new Date()
		});
		//親タスクと連結
		var parent = Tasks.findOne({'_id': parentid});
		if(parent.ctsk){
			//すでに子タスクを持っている場合はその間に入るようにする
			Tasks.update({'_id': newtaskid}, {$set: {ctsk: parent.ctsk}});
		}
		Tasks.update({'_id': parentid}, {$set: {ctsk: newtaskid}});
	},
	deleteTask: function(taskid){
		//セキュリティチェック
		if (! Meteor.userId()) throw new Meteor.Error("not-authorized");
		var cur = Tasks.findOne({'_id': taskid});
		if(cur.ctsk){
			//削除しようとしているタスクが子を持っている場合、それを親に引き継ぐ
			var parent = Tasks.findOne({'ctsk': cur._id});
			if(parent){
				Tasks.update({'_id': parent._id}, {$set: {ctsk: cur.ctsk}});
			}
			//念のためブランチの先頭でないかも調べる
			parent = Tasks.findOne({'brch': cur._id});
			if(parent){
				Tasks.update({'_id': parent._id}, {$pop: {'brch':cur._id}});
				Tasks.update({'_id': parent._id}, {$push: {'brch':cur.ctsk}});
			}
		}
		Tasks.remove({'_id': taskid});
	},
	//更新用メソッド
	updateProjectName: function(prid, name){
		//セキュリティチェック
		if (! Meteor.userId()) throw new Meteor.Error("not-authorized");
		Projects.update({_id: prid}, {$set: {nm: name}});
	},
	updateTaskTitle: function(tid, title){
		//セキュリティチェック
		if (! Meteor.userId()) throw new Meteor.Error("not-authorized");
		Tasks.update({_id: tid}, {$set: {ti: title}});
	},
	updateTaskUser: function(tid, user){
		//セキュリティチェック
		if (! Meteor.userId()) throw new Meteor.Error("not-authorized");
		Tasks.update({_id: tid}, {$set: {us: user}});
	},
	updateTaskDeadline: function(tid, deadline){
		//セキュリティチェック
		if (! Meteor.userId()) throw new Meteor.Error("not-authorized");
		Tasks.update({_id: tid}, {$set: {dl: deadline}});
	}
});