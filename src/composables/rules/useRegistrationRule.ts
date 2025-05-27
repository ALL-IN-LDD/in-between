/**
 * Managing form validation rules for registration.
 *
 * @returns {Object} - An object containing the form validation rules for `name` and `credits`.
 */

import { reactive } from 'vue'
import type { FormRules, FormItemRule } from 'element-plus'

// ─────────────────────────────
// Types
// ─────────────────────────────

type ValidatorCallback = (error?: Error) => void
type ValidatorRule = FormItemRule & {
  validator?: (rule: FormItemRule, value: number, callback: ValidatorCallback) => void
}

export const useRegistrationRule = reactive<FormRules>({
  name: [
    { required: true, message: 'Please input username', trigger: 'change' },
    { min: 4, message: 'Length should be 4 and above', trigger: 'change' },
    { max: 16, message: 'Length should be only 16 characters long', trigger: 'change' },
  ],
  credits: [
    { required: true, message: 'Please input Credit Score', trigger: 'change' },
    { type: 'number', message: 'Credit must be a number' },
    {
      validator: (rule: FormItemRule, value: number, callback: ValidatorCallback) => {
        if (value === null || value < 200) {
          callback(new Error('Credit should be 200 and above'))
        } else if (value > 1000000000 || !Number.isFinite(value)) {
          callback(new Error('Credit should be a finite number and less than 1,000,000,000'))
        } else {
          callback()
        }
      },
      trigger: 'change',
    } as ValidatorRule,
  ],
})
