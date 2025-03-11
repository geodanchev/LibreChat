const { logger } = require('~/config');
// const { Categories } = require('./schema/categories');

const options = [
  {
    label: 'General',
    value: 'com_ui_general',
  },
  {
    label: 'Academy',
    value: 'com_ui_academy',
  },
  {
    label: 'Client Experience',
    value: 'com_ui_client_experience',
  },
  {
    label: 'IT',
    value: 'com_ui_it',
  },
  {
    label: 'Education Hub',
    value: 'com_ui_education_hub',
  },
  {
    label: 'Engineering',
    value: 'com_ui_engineering',
  },
  {
    label: 'Finance',
    value: 'com_ui_finance',
  },
  {
    label: 'Management',
    value: 'com_ui_management',
  },
  {
    label: 'Marketing',
    value: 'com_ui_marketing',
  },
  {
    label: 'People and Culture',
    value: 'com_ui_people_and_culture',
  },
  {
    label: 'Product Management',
    value: 'com_ui_product_management',
  },
  {
    label: 'Professional Services',
    value: 'com_ui_professional_services',
  },
  {
    label: 'Sales',
    value: 'com_ui_sales',
  },
  {
    label: 'Support',
    value: 'com_ui_support',
  }
];

module.exports = {
  /**
   * Retrieves the categories asynchronously.
   * @returns {Promise<TGetCategoriesResponse>} An array of category objects.
   * @throws {Error} If there is an error retrieving the categories.
   */
  getCategories: async () => {
    try {
      // const categories = await Categories.find();
      return options;
    } catch (error) {
      logger.error('Error getting categories', error);
      return [];
    }
  },
};
