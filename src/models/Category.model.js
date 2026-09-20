import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.config.js';

export const Category = sequelize.define(
  'Category',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'Category name is required' },
      },
      set(value) {
        this.setDataValue('name', typeof value === 'string' ? value.trim() : value);
      },
    },
  },
  {
    tableName: 'categories',
    timestamps: true,
  }
);

export default Category;
