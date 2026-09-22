import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.config.js';
import Category from './Category.model.js';
import User from './User.model.js';

export const Customer = sequelize.define(
  'Customer',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    customerName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Customer name is required' },
      },
      set(value) {
        this.setDataValue(
          'customerName',
          typeof value === 'string' ? value.trim() : value
        );
      },
    },
    companyName: {
      type: DataTypes.STRING(150),
      allowNull: true,
      defaultValue: null,
      set(value) {
        this.setDataValue(
          'companyName',
          typeof value === 'string' && value.trim() ? value.trim() : null
        );
      },
    },
    mobile: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
      set(value) {
        this.setDataValue(
          'mobile',
          typeof value === 'string' && value.trim() ? value.trim() : null
        );
      },
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: Category,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      set(value) {
        this.setDataValue(
          'address',
          typeof value === 'string' && value.trim() ? value.trim() : null
        );
      },
    },
  },
  {
    tableName: 'customers',
    timestamps: true,
  }
);

// Define associations
Customer.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
Category.hasMany(Customer, { foreignKey: 'categoryId', as: 'customers' });
Customer.hasOne(User, { foreignKey: 'customerId', as: 'user' });
User.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

export default Customer;
