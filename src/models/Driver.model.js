import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.config.js';

export const Driver = sequelize.define(
  'Driver',
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
        notEmpty: { msg: 'Driver name is required' },
      },
      set(value) {
        this.setDataValue('name', typeof value === 'string' ? value.trim() : value);
      },
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
    },
    salaryType: {
      type: DataTypes.ENUM('monthly', 'daily'),
      allowNull: false,
      defaultValue: 'monthly',
    },
    baseSalary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      validate: {
        min: {
          args: [0],
          msg: 'Base salary cannot be negative',
        },
      },
    },
    dailyAllowance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    joiningDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: 'drivers',
    timestamps: true,
  }
);

export default Driver;
