<template>
  <view class="page">
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

    <!-- 导航栏 -->
    <view class="navbar">
      <view
        class="icon-btn ds-pressable"
        hover-class="is-pressed"
        hover-stay-time="70"
        @click="goBack"
      >
        <text class="icon-btn__text back">‹</text>
      </view>
      <text class="navbar__title">确认预约</text>
      <view class="icon-btn"></view>
    </view>

    <scroll-view scroll-y class="body-scroll" :show-scrollbar="false">
      <!-- 上游带过来的三项，只读回显 -->
      <view class="panel panel--flush">
        <view class="form-row" @click="changeAttraction">
          <text class="form-row__label">景点</text>
          <view class="form-row__value">
            <text class="value__main">{{ attractionName || '—' }}</text>
            <text class="value__sub">{{ attractionSub }}</text>
          </view>
        </view>
        <view class="form-row">
          <text class="form-row__label">地陪</text>
          <view class="form-row__value">
            <text class="value__main">{{ guide.nickname || '—' }}</text>
            <text class="value__sub">接单 {{ guide.orderCount || 0 }} 单</text>
          </view>
        </view>
        <view class="form-row">
          <text class="form-row__label">套餐</text>
          <view class="form-row__value">
            <text class="value__main">{{ selectedPackage.name || '—' }}</text>
            <text class="value__sub">{{ selectedPackage.durationDesc || '' }}</text>
          </view>
        </view>
      </view>

      <!-- 需要游客填的部分 -->
      <view class="panel panel--flush">
        <view class="form-stack">
          <text class="field-label">预约日期</text>
          <picker mode="date" :value="appointDate" :start="minDate" :end="maxDate" @change="onDateChange">
            <view class="picker">
              <text class="picker__text">{{ appointDate }} {{ dowText(appointDate) }}</text>
              <text class="picker__icon">›</text>
            </view>
          </picker>
        </view>

        <!-- 时段：只有半日套餐需要选（BOOKING_TYPE_UI 决定） -->
        <view class="form-stack" v-if="ui.showTimeSlot">
          <text class="field-label">时段</text>
          <view class="segmented">
            <view class="segmented__thumb" :style="thumbStyle"></view>
            <view
              v-for="slot in ui.slotOptions"
              :key="slot"
              :class="['segmented__item', 'ds-pressable', timeSlot === slot ? 'is-on' : '']"
              hover-class="is-pressed"
              hover-stay-time="70"
              @click="timeSlot = slot"
            >
              <text class="segmented__text">{{ slotLabel(slot) }}</text>
            </view>
          </view>
        </view>

        <!-- 小时数：只有小时加购套餐需要（单价 × 小时数） -->
        <view class="form-row" v-if="ui.showHours">
          <text class="form-row__label">小时数</text>
          <view class="stepper">
            <view
              class="stepper__btn ds-pressable"
              hover-class="is-pressed"
              hover-stay-time="70"
              @click="stepHours(-1)"
            >
              <text class="stepper__sign">－</text>
            </view>
            <text class="stepper__num">{{ hours }}</text>
            <view
              class="stepper__btn ds-pressable"
              hover-class="is-pressed"
              hover-stay-time="70"
              @click="stepHours(1)"
            >
              <text class="stepper__sign">＋</text>
            </view>
          </view>
        </view>

        <view class="form-row">
          <text class="form-row__label">人数</text>
          <view class="stepper">
            <!-- 数字本身不动：用户正在读的数不该为了好看而抖 -->
            <view
              class="stepper__btn ds-pressable"
              hover-class="is-pressed"
              hover-stay-time="70"
              @click="stepPeople(-1)"
            >
              <text class="stepper__sign">－</text>
            </view>
            <text class="stepper__num">{{ peopleCount }}</text>
            <view
              class="stepper__btn ds-pressable"
              hover-class="is-pressed"
              hover-stay-time="70"
              @click="stepPeople(1)"
            >
              <text class="stepper__sign">＋</text>
            </view>
          </view>
        </view>

        <view class="form-stack">
          <text class="field-label">备注</text>
          <textarea
            v-model="remark"
            class="textarea"
            placeholder="比如：想拍汉服照、需要地铁站集合、带小孩"
            placeholder-class="textarea-placeholder"
            :maxlength="100"
          />
        </view>
      </view>

      <text class="hint">门票、餐饮、交通不含；超时按 1 小时加购，线下协商或由平台备注</text>

      <view class="bottom-space"></view>
    </scroll-view>

    <!-- 底部固定操作栏 -->
    <view class="bottom-bar">
      <view class="price-block">
        <text class="price-block__label">合计</text>
        <text class="price"><text class="price__symbol">¥</text>{{ amount }}</text>
      </view>
      <view
        :class="['btn', 'btn--filled', 'ds-pressable', submitting ? 'is-disabled' : '']"
        hover-class="is-pressed"
        hover-stay-time="70"
        @click="submit"
      >
        <!-- 提交中给一个常量运动的转圈：进度不该有缓动，也不要让用户以为卡住了 -->
        <view v-if="submitting" class="ds-spinner ds-spinner--on-primary btn__spinner"></view>
        <text class="btn__text">{{ submitting ? '提交中…' : '提交预约' }}</text>
      </view>
    </view>
  </view>
</template>

<script>
/**
 * 游客端 · 下单页（原型 04 屏）
 *
 * 由详情页带参数进入：guideId / packageSkuId / attractionId / appointDate
 * 景点、地陪、套餐三项只读回显（景点可在地陪擅长的景点内更换），
 * 游客只补日期、时段、人数、备注 —— 表单越短，越敢下单。
 *
 * 控件跟随套餐类型（BOOKING_TYPE_UI，唯一来源）：
 *   半日 → 选上午/下午；全天 → 隐藏时段；小时加购 → 显示小时数
 */
import { GuideApi, OrderApi, BOOKING_TYPE_UI, TIME_SLOT_LABELS } from '@/api/index.js';

const DOW = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const MAX_PEOPLE = 9;
const MAX_HOURS = 8;

/**
 * URL 参数一律是字符串，而接口返回的 id 是数字。
 * 不在入口归一化，本页所有 `=== id` 的查找都会静默落空：
 * selectedPackage 回落成 packages[0]（金额、时段/小时数控件全跟着错），
 * attractionName 变成空。提交时段位或小时数缺失，接口报「不合规」。
 */
function toId(value) {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : '';
}

export default {
  data() {
    return {
      guideId: '',
      attractionId: '',
      packageSkuId: '',
      appointDate: '',
      guide: {},
      timeSlot: '',
      hours: 3,
      peopleCount: 2,
      remark: '',
      minDate: '',
      maxDate: '',
      submitting: false,
      statusBarHeight: 20
    };
  },

  computed: {
    selectedPackage() {
      const packages = this.guide.packages || [];
      return packages.find((pkg) => pkg.packageSkuId === this.packageSkuId) || packages[0] || {};
    },

    /** 下单页控件规则：全部取自 BOOKING_TYPE_UI */
    ui() {
      return BOOKING_TYPE_UI[this.selectedPackage.bookingType] || { showTimeSlot: false, showHours: false, slotOptions: [] };
    },

    attractionName() {
      const found = (this.guide.attractions || []).find((item) => item.id === this.attractionId);
      return found ? found.name : '';
    },

    attractionSub() {
      const count = (this.guide.attractions || []).length;
      return count > 1 ? `可在地陪擅长的 ${count} 个景点内更换` : '该地陪擅长的景点';
    },

    /** 合计：小时加购按「单价 × 小时数」，其余套餐按套餐价 */
    amount() {
      const price = this.selectedPackage.price || 0;
      return this.ui.showHours ? price * this.hours : price;
    },

    /* 分段滑块：宽度由段数算，位移只用 translateX 的百分比（按自身宽度算，正好一段） */
    thumbStyle() {
      const options = this.ui.slotOptions || [];
      const index = Math.max(options.indexOf(this.timeSlot), 0);
      return {
        width: `calc((100% - 6px) / ${options.length || 1})`,
        transform: `translateX(${index * 100}%)`
      };
    }
  },

  onLoad(options = {}) {
    const sys = uni.getSystemInfoSync();
    this.statusBarHeight = sys.statusBarHeight || 20;

    this.guideId = toId(options.guideId);
    this.packageSkuId = toId(options.packageSkuId);
    this.attractionId = toId(options.attractionId);
    this.appointDate = options.appointDate || '';

    const today = new Date();
    this.minDate = this.formatDate(today);
    this.maxDate = this.formatDate(new Date(today.getTime() + 14 * 24 * 3600 * 1000));
    if (!this.appointDate) {
      this.appointDate = this.minDate;
    }

    this.loadGuide();
  },

  watch: {
    /** 套餐类型决定控件：切到不需要时段的类型时清掉已选时段，避免提交无意义字段 */
    'ui.showTimeSlot'(show) {
      this.timeSlot = show ? (this.ui.slotOptions[0] || '') : '';
    }
  },

  methods: {
    async loadGuide() {
      try {
        const data = await GuideApi.getGuideDetail(this.guideId);
        this.guide = data || {};
        if (!this.attractionId) {
          this.attractionId = (this.guide.attractionIds || [])[0] || '';
        }
        if (!this.packageSkuId) {
          const first = (this.guide.packages || [])[0];
          this.packageSkuId = first ? first.packageSkuId : '';
        }
        this.timeSlot = this.ui.slotOptions[0] || '';
      } catch (e) {
        console.error('加载地陪信息失败', e);
        uni.showToast({ title: (e && e.message) || '加载失败', icon: 'none' });
      }
    },

    changeAttraction() {
      const attractions = this.guide.attractions || [];
      if (attractions.length <= 1) {
        uni.showToast({ title: '该地陪只带这一个景点', icon: 'none' });
        return;
      }
      uni.showActionSheet({
        itemList: attractions.map((item) => item.name),
        success: (res) => {
          this.attractionId = attractions[res.tapIndex].id;
        }
      });
    },

    onDateChange(e) {
      this.appointDate = e.detail.value;
    },

    stepPeople(delta) {
      const next = this.peopleCount + delta;
      if (next < 1 || next > MAX_PEOPLE) return;
      this.peopleCount = next;
    },

    stepHours(delta) {
      const next = this.hours + delta;
      if (next < 1 || next > MAX_HOURS) return;
      this.hours = next;
    },

    slotLabel(slot) {
      return TIME_SLOT_LABELS[slot] || slot;
    },

    dowText(appointDate) {
      if (!appointDate) return '';
      if (appointDate === this.minDate) return '今天';
      const [year, month, day] = appointDate.split('-').map(Number);
      return DOW[new Date(year, month - 1, day).getDay()];
    },

    formatDate(date) {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${date.getFullYear()}-${month}-${day}`;
    },

    goBack() {
      uni.navigateBack();
    },

    async submit() {
      if (this.submitting) return;

      if (!uni.getStorageSync('token')) {
        uni.showToast({ title: '请先登录', icon: 'none' });
        setTimeout(() => uni.redirectTo({ url: '/pages/login/login' }), 800);
        return;
      }
      if (!this.attractionId) {
        uni.showToast({ title: '请选择景点', icon: 'none' });
        return;
      }
      if (!this.appointDate) {
        uni.showToast({ title: '请选择预约日期', icon: 'none' });
        return;
      }
      if (this.ui.showTimeSlot && !this.timeSlot) {
        uni.showToast({ title: '请选择时段', icon: 'none' });
        return;
      }

      this.submitting = true;
      try {
        const payload = {
          guideId: this.guideId,
          attractionId: this.attractionId,
          packageSkuId: this.packageSkuId,
          appointDate: this.appointDate,
          peopleCount: this.peopleCount,
          remark: this.remark
        };
        if (this.ui.showTimeSlot) payload.timeSlot = this.timeSlot;
        if (this.ui.showHours) payload.hours = this.hours;

        await OrderApi.createOrder(payload);

        uni.showToast({ title: '预约已提交', icon: 'success' });
        setTimeout(() => {
          // 用 redirectTo：提交成功后再返回表单页没有意义
          uni.redirectTo({ url: '/pages/appointment/my' });
        }, 1200);
      } catch (e) {
        console.error('提交预约失败', e);
        uni.showToast({ title: (e && e.message) || '提交失败', icon: 'none' });
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: $ds-surface;
  /* 光斑：表单页要克制，右上只剩一点紫（气泡漫游 · bg-calm 档） */
  background-image: $ds-bg-calm;
}

.status-bar {
  flex-shrink: 0;
}

/* ---------- 导航栏 ---------- */
.navbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  height: $ds-h-navbar;
  padding: 0 $ds-space-2;
}

.icon-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn__text {
  font-size: 24px;
  line-height: 1;
  color: $ds-ink;
}

.back {
  font-size: 26px;
}

.navbar__title {
  flex: 1;
  text-align: center;
  font-family: $ds-font-title;
  font-size: $ds-fs-title;
  font-weight: 700;
  letter-spacing: $ds-ls-title;
  color: $ds-ink;
}

/* ---------- 内容 ---------- */
.body-scroll {
  flex: 1;
  height: 0;
}

.panel {
  margin: 0 $ds-pad-screen $ds-space-3;
  padding: $ds-space-4;
  background: $ds-surface-container;
  border: $ds-card-border;
  border-radius: $ds-shape-lg;
  box-shadow: $ds-el-1;

  &--flush {
    padding: $ds-space-1 0;
    overflow: hidden;
  }
}

/* ---------- 只读回显行 ---------- */
.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: $ds-h-row;
  padding: $ds-space-2 18px;
}

.form-row__label {
  flex-shrink: 0;
  width: 64px;
  font-size: 13.5px;
  color: $ds-ink-2;
}

.form-row__value {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.value__main {
  font-size: 14.5px;
  font-weight: 700;
  color: $ds-ink;
}

.value__sub {
  margin-top: 2px;
  font-size: $ds-fs-label-sm;
  color: $ds-ink-3;
}

/* ---------- 需要填的部分 ---------- */
.form-stack {
  padding: $ds-space-3 18px;

  + .form-stack {
    border-top: 1px solid $ds-outline-variant;
  }
}

.field-label {
  display: block;
  margin-bottom: $ds-space-2;
  font-size: $ds-fs-label-sm;
  font-weight: 700;
  color: $ds-ink-2;
}

.picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: $ds-h-touch;
  padding: 0 $ds-space-3;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid transparent;
  border-radius: $ds-shape-sm;
}

.picker__text {
  font-size: 14.5px;
  font-weight: 700;
  color: $ds-ink;
}

.picker__icon {
  font-size: 18px;
  color: $ds-ink-2;
}

.segmented {
  position: relative;
  display: flex;
  padding: 4px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: $ds-shape-full;
}

/* 选中块：只用 translateX 滑，不动 width / left */
.segmented__thumb {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  border-radius: $ds-shape-full;
  background: #ffffff;
  box-shadow: 0 4px 12px -8px rgba(80, 70, 140, 0.6);
  transition: transform $ds-dur-slide $ds-ease-in-out;
}

.segmented__item {
  position: relative;
  z-index: 1;
  flex: 1;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $ds-shape-full;

  &.is-on {
    .segmented__text {
      color: $ds-secondary;
      font-weight: 650;
    }
  }
}

.segmented__text {
  font-size: $ds-fs-body-sm;
  color: $ds-ink-2;
  transition: color $ds-dur-fast $ds-ease-out;
}

.stepper {
  display: flex;
  align-items: center;
}

.stepper__btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: $ds-primary-container;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stepper__sign {
  font-size: 15px;
  line-height: 1;
  color: $ds-secondary;
}

.stepper__num {
  min-width: 26px;
  text-align: center;
  font-size: 16px;
  font-weight: 750;
  color: $ds-ink;
}

.textarea {
  width: 100%;
  height: 78px;
  padding: $ds-space-3 14px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: $ds-shape-sm;
  font-size: 13px;
  line-height: 1.6;
  color: $ds-ink;
}

.textarea-placeholder {
  color: $ds-primary-dim;
}

.hint {
  display: block;
  padding: 0 $ds-pad-screen;
  font-size: $ds-fs-label-sm;
  line-height: 1.6;
  color: $ds-ink-3;
}

/* ---------- 底部操作栏 ---------- */
.bottom-space {
  height: 80px;
}

.bottom-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 13px $ds-pad-screen;
  padding-bottom: max(13px, env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.78);
  border-top: 1px solid rgba(42, 39, 64, 0.06);
  box-shadow: $ds-el-3;
}

.price-block__label {
  display: block;
  font-size: $ds-fs-caption;
  color: $ds-ink-3;
}

.price {
  font-size: 25px;
  font-weight: 750;
  color: $ds-tertiary;
}

.price__symbol {
  font-size: 13px;
  font-weight: 600;
}

/* 主按钮：纯黑胶囊（不用渐变），一屏一个主操作 */
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $ds-shape-full;

  &--filled {
    height: $ds-h-btn;
    padding: 0 $ds-space-6;
    background: $ds-ink-btn;
    box-shadow: $ds-btn-shadow;

    .btn__text {
      color: #ffffff;
    }
  }

  &.is-disabled {
    background: $ds-primary-dim;
  }
}

.btn__spinner {
  margin-right: $ds-space-2;
}

.btn__text {
  font-size: $ds-fs-body-sm;
  font-weight: 600;
}
</style>
