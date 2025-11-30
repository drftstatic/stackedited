<template>
  <div class="form-entry" :error="error">
    <label class="form-entry__label" :for="uid">{{ label }}<span v-if="info" class="form-entry__label-info"> &mdash; {{ info }}</span></label>
    <div class="form-entry__field">
      <slot name="field" />
    </div>
    <slot />
  </div>
</template>

<script>
import utils from '../../../services/utils';

export default {
  props: ['label', 'info', 'error'],
  data: () => ({
    uid: utils.uid(),
  }),
  mounted() {
    this.$el.querySelector('input,select').id = this.uid;
  },
};
</script>
