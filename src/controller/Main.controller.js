sap.ui.define([
	"sap/ui/demo/hackernews/controller/BaseController",
], function(BaseController) {
	"use strict";


	var _aValidTabKeys = ["news", "newest", "show", "ask", "jobs"];
	var _aValidPageKeys = ["user", "comments"];

	return BaseController.extend("sap.ui.demo.hackernews.controller.Main", {
		
		onInit : function () {
			//Routing
			var oRouter = this.getRouter();
			this.getView().setModel(new sap.ui.model.json.JSONModel(), "view");
			oRouter.getRoute("main").attachMatched(this._onRouteMatched, this);
			oRouter.getRoute("user").attachMatched(this._onUserRouteMatched, this);
			oRouter.getRoute("comment").attachMatched(this._onCommentRouteMatched, this);

			//Listen for network connection
			var msgStrip = this.getView().byId("msgStrip");
			msgStrip.setVisible(!navigator.onLine);
			this._setConnectionListener();

			// add new content to the end of result container
			var oContent = this.byId("resultContainer").getContent();
			var oResultsFragment = sap.ui.xmlfragment(this.getView().getId(), "sap.ui.demo.hackernews.view.fragments.Stories", this);
			this.byId("resultContainer").addContent(oResultsFragment);

			//request stories and show in list
			this.getView().setModel(new sap.ui.model.json.JSONModel());
			this._bindListItems();
		},

		_setConnectionListener: function(){
			var msgStrip = this.getView().byId("msgStrip");
			var oModel = this.getView().getModel();
			var self = this;
			function updateOnlineStatus(event) {
				if (navigator.onLine) {
					// handle online status
					console.log('online');
					msgStrip.setText("You are in online mode");
					msgStrip.setType("Success");
		
				} else {
					// handle offline status
					console.log('offline');
					msgStrip.setText("You are in offline mode");
					msgStrip.setType("Warning");
					msgStrip.setVisible(true);
				}
			}
			window.addEventListener('online', updateOnlineStatus);
			window.addEventListener('offline', updateOnlineStatus);

			if('serviceWorker' in navigator){
				// Handler for messages coming from the service worker
				navigator.serviceWorker.addEventListener('message', function(event){
					var url = event.data;
					self.replay(url);
				});
			}
		},

		_onRouteMatched : function (oEvent) {
			var oArgs = oEvent.getParameter("arguments");
			var oView = this.getView();
			var oQuery = oArgs["?query"];

			if (oQuery && _aValidTabKeys.indexOf(oQuery.tab) > -1){
				oView.getModel("view").setProperty("/selectedTabKey", oQuery.tab);
				this.showStories(oQuery.tab, oQuery.page);
				this.byId("pageNum").setText(oQuery.page);

			} else if (oQuery && _aValidPageKeys.indexOf(oQuery.page) > -1){
				oView.getModel("view").setProperty("/selectedTabKey", oQuery);
			} else {
				// the default query param should be visible at all time
				this.getRouter().navTo("main", {
					query: {
						tab : _aValidTabKeys[0],
						page: 1
					}
				},false);
			}
		},

		_onUserRouteMatched : function (oEvent) {
			var oArgs = oEvent.getParameter("arguments");
			var oView = this.getView();
			var oQuery = oArgs["userName"];

			if (oQuery){
				this._showUser(oQuery);
			}
		},

		_onCommentRouteMatched : function (oEvent) {
			var oArgs = oEvent.getParameter("arguments");
			var oView = this.getView();
			var oQuery = oArgs["id"];

			if (oQuery){
				this._showComments(oQuery);
			}
		},

		onTabSelect: function(oEvent) {
			var key = oEvent.getParameters().key;

			this.getRouter().navTo("main", {
				query: {
					tab : oEvent.getParameter("selectedKey"),
					page: 1
				}
			}, false);

		},

		_bindListItems: function(){
			//create list for stories
			var oList = this.byId("mainList");
			var self = this;
			oList.bindItems("/", new sap.m.CustomListItem({ 
				content: [new sap.m.HBox({
					items: [
						new sap.m.Text({
							text: "{rowIndex}",
							wrapping: false
						}).addStyleClass("numberCSS"),

						new sap.m.VBox({
							items: [
								new sap.m.Link({
									wrapping: true,
									text: "{title}",
									href: "{url}"
								}).addStyleClass("titleCSS"),

								new sap.m.HBox({
									wrap: sap.m.FlexWrap.Wrap,
									items: [
										new sap.m.Text({
											text: "{points} points by",
											wrapping: false
										}).addStyleClass("descCSS"),

										new sap.m.Link({
											text: "{user}",
											wrapping: false,
											press: function(){
												self._showUser(this.getText())
											}
										}).addStyleClass("descLinkCSS"),

										new sap.m.Text({
											text: "|  {time_ago}  |",
											wrapping: false
										}).addStyleClass("descCSS"),

										new sap.m.Link({
											text: "{comments_count} comments",
											target: "{id}",
											press: function() {
												self._showComments(this.getTarget())
											}
										}).addStyleClass("descLinkCSS"),
									]
								})
							]
						})
					]
				})]
			}))

			var oModel = new sap.ui.model.json.JSONModel();
			oList.setModel(oModel);
		},

		showStories : function (urlSuffix, page) {
			// destroy existing content
			var oContent = this.byId("resultContainer").getContent();
			oContent.pop().destroy();

			// change fragment
			var oResultsFragment = sap.ui.xmlfragment(this.getView().getId(), "sap.ui.demo.hackernews.view.fragments.Stories", this);
			this.byId("resultContainer").addContent(oResultsFragment);
			this._bindListItems();

			if(urlSuffix === 'jobs'){
				this.getView().byId('btnNext').setEnabled(false);
			}

			var urlPrefix = this._getAPI();
			var oList = this.byId("mainList");
			var oModel = oList.getModel();
			var self = this;
			$.ajax({
				url: urlPrefix + urlSuffix + "?page=" + page,
				jsonpCallback: 'processJSON',
				contentType : "application/json",
				cache: true,
				dataType: 'jsonp',
				success: function (data) {
					console.log("success");
					// add row index
					for(var i = 0; i<data.length; i++){
						data[i]["rowIndex"] = i+1+(page-1)*30;
					}
			
					oModel.setData(data);
				},
				error: function (e) {
					console.log(e.message);
				}
			})
		},

		_switchPage: function(increment){
			var oList = this.byId("mainList");
			var oPageNum = this.byId("pageNum");
			var page = parseInt(oPageNum.getText());
			var btnPrev = this.byId("btnPrev");
			var btnNext = this.byId("btnNext");

			if(increment){
				if(page === 1){
					btnPrev.setEnabled(true);
				}
				if(page === 9){
					btnNext.setEnabled(false);
				}
				page++;
			} else{
				if(page > 1){
					if(page === 2){
						btnPrev.setEnabled(false);
					}
					if(page === 10){
						btnNext.setEnabled(true);
					}
					page--;
				}
			}
			
			var key = this.byId("iconTabHeader").getSelectedKey();

			if(key === 'ask' || key === 'show'){
				if(page === 2){
					btnNext.setEnabled(false);
				} else {
					btnNext.setEnabled(true);
				}
			}

			oPageNum.setText(page);

			//Routing
			this.getRouter().navTo("main", {
				query: {
					tab: key,
					page: page
				}
			}, false);
		},

		replay: function(url){
			//type of requests (user, news or comment)
			var type = url.replace(this._getAPI(),'');
			if(type.indexOf('/')!= -1){
				type = type.substring(0, type.indexOf('/'));
			} else{
				type = type.substring(0, type.indexOf('?'));
			}

			console.log(type);
			if(type==="user"){
				this.requestUser(url.replace("?callback=processJSON",''));
			} else if (type==="item"){
				this.requestComment(url.replace("?callback=processJSON",''));
			} else {
				var page = url.replace(this._getAPI(),'').replace("&callback=processJSON",'').replace("?page=",'').replace(type,'');
				this.showStories(type, page);
			}
			
		},

		_showUser: function(user){
			// destroy existing content
			var oContent = this.byId("resultContainer").getContent();
			oContent.pop().destroy();

			var url = this._getAPI() + "user/" + user;
			this.requestUser(url);

			var oResultsFragment = sap.ui.xmlfragment(this.getView().getId(), "sap.ui.demo.hackernews.view.fragments.User", this);
			this.byId("resultContainer").addContent(oResultsFragment);
			this.byId("iconTabHeader").setSelectedKey("user");

			//Routing
			this.getRouter().navTo("user", {
				userName: user,
			}, false);
		},

		requestUser: function(url){
			// request details of user
			var self = this;
			$.ajax({
				url: url,
				jsonpCallback: 'processJSON',
				contentType : "application/json",
				dataType: 'jsonp',
				cache: true,
				success: function (data) {
					// process result
					self.getView().byId("userHeader").setTitle(data["id"]);
					self.getView().byId("aCreated").setText("Created: " + data["created"]);
					self.getView().byId("aKarma").setText("Karma: " + data["karma"]);
				},
				error: function (e) {
					 // log error in browser
					console.log(e.message);
				},
			})
		},


		_showComments: function(idItem){
			// destroy existing content
			var oContent = this.byId("resultContainer").getContent();
			oContent.pop().destroy();
			var oResultsFragment = sap.ui.xmlfragment(this.getView().getId(), "sap.ui.demo.hackernews.view.fragments.Comments", this);
			this.byId("resultContainer").addContent(oResultsFragment);
			
			var url = this._getAPI() + "item/" + idItem
			this.requestComment(url);

			//Routing
			this.getRouter().navTo("comment", {
				id: idItem
			}, false);
		},

		requestComment: function(url){
			var oTree = this.getView().byId("commentsTree");
			oTree.setBusy(true);
			var oModel = this.getView().getModel();
			var self = this;
			$.ajax({
				url: url,
				jsonpCallback: 'processJSON',
				contentType : "application/json",
				dataType: 'jsonp',
				cache: true,
				success: function (data) {
					// process result
					self.getView().byId("commentsHeader").setTitle(data["title"]);
					self.getView().byId("aUrl").setText("("+data["domain"]+")");
					self.getView().byId("aPoints").setText(data["points"]+" points");
					self.getView().byId("aAuthor").setText("by "+data["user"]);
					self.getView().byId("aTime").setText(data["time_ago"]);

					oModel.setData(data);
					self.getView().setModel(oModel);
					oTree.setBusy(false);
				},
				error: function (e) {
					 // log error in browser
				},
			})
		},

		onPrevPressed: function(event){
			this._switchPage(false);
		},

		onNextPressed: function(event){
			this._switchPage(true);
		},

		onAboutPressed: function(event){
			// add new content to the end of result container
			sap.m.URLHelper.redirect("https://openui5.hana.ondemand.com/");
		},

		_getAPI: function(){
			return "https://node-hnapi.herokuapp.com/";
		},

		redirectToSubmissions: function(event){
			var user = this.getView().byId("userHeader").getTitle();
			sap.m.URLHelper.redirect("https://news.ycombinator.com/submitted?id="+user);
		},

		redirectToComments: function(event){
			var user = this.getView().byId("userHeader").getTitle();
			sap.m.URLHelper.redirect("https://news.ycombinator.com/threads?id="+user);
		}
	});
});