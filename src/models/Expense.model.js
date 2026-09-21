import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.config.js';
import Vehicle from './Vehicle.model.js';

export const Expense = sequelize.define(
  'Expense',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    vehicleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    vehicleNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
      set(value) {
        this.setDataValue(
          'vehicleNumber',
          typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : null
        );
      },
    },
    diesel: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: {
          args: [0],
          msg: 'Diesel expense cannot be negative',
        },
      },
    },
    driver: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: {
          args: [0],
          msg: 'Driver expense cannot be negative',
        },
      },
    },
    maintenance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: {
          args: [0],
          msg: 'Maintenance expense cannot be negative',
        },
      },
    },
    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      set(value) {
        this.setDataValue(
          'note',
          typeof value === 'string' && value.trim() ? value.trim() : null
        );
      },
    },
    expenseDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'expenses',
    timestamps: true,
    hooks: {
      beforeSave: (expense) => {
        const d = parseFloat(expense.diesel) || 0;
        const dr = parseFloat(expense.driver) || 0;
        const m = parseFloat(expense.maintenance) || 0;
        expense.totalAmount = parseFloat((d + dr + m).toFixed(2));
      },
    },
  }
);

// Define associations
Expense.belongsTo(Vehicle, { foreignKey: 'vehicleId', as: 'vehicle' });
Vehicle.hasMany(Expense, { foreignKey: 'vehicleId', as: 'expenses' });

export default Expense;
