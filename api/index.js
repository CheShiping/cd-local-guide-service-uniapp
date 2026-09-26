/**
 * 云数据库操作封装
 * 陪玩小程序核心API
 */

// 获取数据库引用（兼容不同平台）
let db, _;
// #ifdef MP-WEIXIN
db = wx.cloud.database();
_ = db.command;
// #endif

// 模拟数据（开发环境使用）
const mockData = {
  users: [],
  clerks: [
    { _id: '1', nickname: '小美', avatar: '/static/images/default-avatar.png', sex: 2, city: '北京', price: 30, orderCount: 128, onlineStatus: 1, skills: ['王者荣耀', '和平精英'], introduce: '资深玩家，带你上分无忧~' },
    { _id: '2', nickname: '阿杰', avatar: '/static/images/default-avatar.png', sex: 1, city: '上海', price: 25, orderCount: 86, onlineStatus: 0, skills: ['英雄联盟', 'CSGO'], introduce: '职业选手水平，欢迎来战~' },
    { _id: '3', nickname: '小雪', avatar: '/static/images/default-avatar.png', sex: 2, city: '广州', price: 35, orderCount: 256, onlineStatus: 1, skills: ['原神', '崩坏星穹铁道'], introduce: '原神满级大佬，带你探索提瓦特~' },
    { _id: '4', nickname: '小琳', avatar: '/static/images/default-avatar.png', sex: 2, city: '深圳', price: 28, orderCount: 168, onlineStatus: 1, skills: ['王者荣耀', '原神'], introduce: '多游戏达人，欢迎咨询~' },
    { _id: '5', nickname: '大伟', avatar: '/static/images/default-avatar.png', sex: 1, city: '成都', price: 22, orderCount: 52, onlineStatus: 0, skills: ['和平精英', '永劫无间'], introduce: 'FPS高手，带你吃鸡~' },
  ],
  categories: [
    { _id: 'c1', name: '王者荣耀', icon: '🎮' },
    { _id: 'c2', name: '和平精英', icon: '🔫' },
    { _id: 'c3', name: '原神', icon: '⚔️' },
    { _id: 'c4', name: '英雄联盟', icon: '🏆' },
    { _id: 'c5', name: 'CSGO', icon: '🎯' },
    { _id: 'c6', name: '永劫无间', icon: '🗡️' },
  ],
  appointments: []
};

// 是否使用模拟数据
const useMock = true;

/**
 * 用户相关API
 */
export const UserApi = {
  async getCurrentUser() {
    if (useMock) {
      const token = uni.getStorageSync('token');
      if (token) {
        return { _id: 'u1', nickname: '测试用户', avatar: '/static/images/default-avatar.png', isAdmin: true };
      }
      return null;
    }
    // #ifdef MP-WEIXIN
    const { data } = await db.collection('user').where({ openid: '{openid}' }).get();
    return data[0] || null;
    // #endif
    return null;
  },

  async getUserInfo() {
    return this.getCurrentUser();
  },

  async saveUserInfo(userInfo) {
    if (useMock) return 'u1';
    // #ifdef MP-WEIXIN
    const user = await this.getUserInfo();
    if (user) {
      await db.collection('user').doc(user._id).update({ data: userInfo });
      return user._id;
    } else {
      const { _id } = await db.collection('user').add({
        data: { ...userInfo, isAdmin: 0, createTime: db.serverDate() }
      });
      return _id;
    }
    // #endif
    return null;
  },

  async isAdmin() {
    const user = await this.getCurrentUser();
    return user && user.isAdmin === true;
  },

  /**
   * 微信登录
   */
  async wxLogin(params = {}) {
    if (useMock) {
      // 模拟登录成功
      return { 
        token: 'mock_token_' + Date.now(),
        openid: 'mock_openid',
        userInfo: {
          _id: 'u1',
          nickname: '测试用户',
          avatar: '/static/images/default-avatar.png'
        }
      };
    }
    
    // #ifdef MP-WEIXIN
    const { code, encryptedData, iv } = params;
    
    // 调用云函数进行登录
    const { result } = await wx.cloud.callFunction({
      name: 'login',
      data: { code, encryptedData, iv }
    });
    
    return result;
    // #endif
    
    return { token: '', openid: '' };
  },

  /**
   * 退出登录
   */
  async logout() {
    uni.removeStorageSync('token');
    return true;
  }
};

/**
 * 达人相关API
 */
export const ClerkApi = {
  async getClerkList(params = {}) {
    const { pageNo = 1, pageSize = 10, sex, city, categoryId, keyword } = params;
    
    if (useMock) {
      let list = [...mockData.clerks];
      if (sex !== undefined && sex !== '') {
        list = list.filter(item => item.sex === Number(sex));
      }
      if (keyword) {
        list = list.filter(item => item.nickname.includes(keyword));
      }
      const total = list.length;
      const start = (pageNo - 1) * pageSize;
      list = list.slice(start, start + pageSize);
      return { list, total };
    }
    
    // #ifdef MP-WEIXIN
    let query = db.collection('clerk').where({ status: 1 });
    if (sex !== undefined && sex !== '') {
      query = query.where({ sex: Number(sex) });
    }
    if (city) {
      query = query.where({ city });
    }
    if (categoryId) {
      query = query.where({ categoryIds: _.all([categoryId]) });
    }
    const { total } = await query.count();
    const { data } = await query
      .orderBy('onlineStatus', 'desc')
      .orderBy('orderCount', 'desc')
      .orderBy('createTime', 'desc')
      .skip((pageNo - 1) * pageSize)
      .limit(pageSize)
      .get();
    return { list: data, total };
    // #endif
    
    return { list: [], total: 0 };
  },

  async getClerkDetail(clerkId) {
    if (useMock) {
      return mockData.clerks.find(c => c._id === clerkId) || null;
    }
    // #ifdef MP-WEIXIN
    const { data } = await db.collection('clerk').doc(clerkId).get();
    return data;
    // #endif
    return null;
  },

  async createClerk(clerkInfo) {
    if (useMock) return 'new_clerk';
    // #ifdef MP-WEIXIN
    const { _id } = await db.collection('clerk').add({
      data: { ...clerkInfo, orderCount: 0, createTime: db.serverDate() }
    });
    return _id;
    // #endif
    return null;
  },

  async updateClerk(clerkId, clerkInfo) {
    if (useMock) return;
    // #ifdef MP-WEIXIN
    await db.collection('clerk').doc(clerkId).update({ data: clerkInfo });
    // #endif
  },

  async getPendingClerks(pageNo = 1, pageSize = 10) {
    if (useMock) return { list: [], total: 0 };
    // #ifdef MP-WEIXIN
    const query = db.collection('clerk').where({ status: 0 });
    const { total } = await query.count();
    const { data } = await query
      .orderBy('createTime', 'desc')
      .skip((pageNo - 1) * pageSize)
      .limit(pageSize)
      .get();
    return { list: data, total };
    // #endif
    return { list: [], total: 0 };
  },

  async auditClerk(clerkId, status) {
    if (useMock) return;
    // #ifdef MP-WEIXIN
    await db.collection('clerk').doc(clerkId).update({ data: { status } });
    // #endif
  }
};

/**
 * 分类相关API
 */
export const CategoryApi = {
  async getCategoryList() {
    if (useMock) return mockData.categories;
    // #ifdef MP-WEIXIN
    const { data } = await db.collection('category').where({ status: 1 })
      .orderBy('sort', 'asc')
      .orderBy('createTime', 'desc')
      .get();
    return data;
    // #endif
    return [];
  },

  async createCategory(categoryInfo) {
    if (useMock) return 'new_cat';
    // #ifdef MP-WEIXIN
    const { _id } = await db.collection('category').add({
      data: { ...categoryInfo, status: 1, createTime: db.serverDate() }
    });
    return _id;
    // #endif
    return null;
  }
};

/**
 * 预约相关API
 */
export const AppointmentApi = {
  async createAppointment(appointInfo) {
    if (useMock) return 'new_appoint';
    // #ifdef MP-WEIXIN
    const { _id } = await db.collection('appointment').add({
      data: { ...appointInfo, status: 0, createTime: db.serverDate() }
    });
    return _id;
    // #endif
    return null;
  },

  async getMyAppointments(params = {}) {
    const { pageNo = 1, pageSize = 10, status } = params;
    
    if (useMock) {
      let list = [...mockData.appointments];
      if (status !== undefined) {
        list = list.filter(item => item.status === Number(status));
      }
      const total = list.length;
      const start = (pageNo - 1) * pageSize;
      list = list.slice(start, start + pageSize);
      return { list, total };
    }
    
    // #ifdef MP-WEIXIN
    let query = db.collection('appointment').where({ userId: '{openid}' });
    if (status !== undefined) {
      query = query.where({ status: Number(status) });
    }
    const { total } = await query.count();
    const { data } = await query
      .orderBy('createTime', 'desc')
      .skip((pageNo - 1) * pageSize)
      .limit(pageSize)
      .get();
    return { list: data, total };
    // #endif
    
    return { list: [], total: 0 };
  },

  async getAllAppointments(params = {}) {
    const { pageNo = 1, pageSize = 10, status, clerkId, appointDate } = params;
    
    if (useMock) return { list: [], total: 0 };
    
    // #ifdef MP-WEIXIN
    let query = db.collection('appointment');
    if (status !== undefined) {
      query = query.where({ status: Number(status) });
    }
    if (clerkId) {
      query = query.where({ clerkId });
    }
    if (appointDate) {
      query = query.where({ appointDate });
    }
    const { total } = await query.count();
    const { data } = await query
      .orderBy('createTime', 'desc')
      .skip((pageNo - 1) * pageSize)
      .limit(pageSize)
      .get();
    return { list: data, total };
    // #endif
    
    return { list: [], total: 0 };
  },

  async cancelAppointment(appointId) {
    if (useMock) return;
    // #ifdef MP-WEIXIN
    await db.collection('appointment').doc(appointId).update({ data: { status: 2 } });
    // #endif
  },

  async completeAppointment(appointId) {
    if (useMock) return;
    // #ifdef MP-WEIXIN
    await db.collection('appointment').doc(appointId).update({ data: { status: 1 } });
    // #endif
  }
};
