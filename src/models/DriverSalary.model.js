import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.config.js';
import Driver from './Driver.model.js';

export const DriverSalary = sequelize.define(
  'DriverSalary',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    driverId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Driver,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    month: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 12,
      },
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    monthYear: {
      type: DataTypes.STRING(7), // '2026-10'
      allowNull: false,
    },
    baseSalary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    totalDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
    },
    leaveDays: {
      type: DataTypes.DECIMAL(5, 1),
      allowNull: false,
      defaultValue: 0.0,
    },
    workedDays: {
      type: DataTypes.DECIMAL(5, 1),
      allowNull: false,
      defaultValue: 30.0,
    },
    perDaySalary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    leaveDeduction: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    grossEarned: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    totalUpadDeducted: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    bonusAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    otherDeductions: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    netPayable: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    paidAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    paymentDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null,
    },
    paymentMode: {
      type: DataTypes.ENUM('Cash', 'Online', 'Bank Transfer', 'Cheque', 'Other'),
      allowNull: false,
      defaultValue: 'Cash',
    },
    paymentStatus: {
      type: DataTypes.ENUM('Paid', 'Partial', 'Pending'),
      allowNull: false,
      defaultValue: 'Pending',
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: 'driver_salaries',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['driverId', 'monthYear'],
      },
      {
        fields: ['monthYear'],
      },
    ],
  }
);

// Associations
Driver.hasMany(DriverSalary, { foreignKey: 'driverId', as: 'salaries' });
DriverSalary.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });

export default DriverSalary;
