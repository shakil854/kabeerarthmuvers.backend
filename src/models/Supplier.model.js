import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.config.js';
import Category from './Category.model.js';
import User from './User.model.js';

export const Supplier = sequelize.define(
  'Supplier',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Supplier name is required' },
      },
      set(value) {
        this.setDataValue('name', typeof value === 'string' ? value.trim() : value);
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
    tableName: 'suppliers',
    timestamps: true,
  }
);

// Define associations
Supplier.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
Category.hasMany(Supplier, { foreignKey: 'categoryId', as: 'suppliers' });
Supplier.hasOne(User, { foreignKey: 'supplierId', as: 'user' });
User.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });

export default Supplier;
