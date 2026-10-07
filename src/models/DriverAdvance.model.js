import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.config.js';
import Driver from './Driver.model.js';

export const DriverAdvance = sequelize.define(
  'DriverAdvance',
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
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        notNull: { msg: 'Advance amount is required' },
        min: {
          args: [0.01],
          msg: 'Advance amount must be greater than 0',
        },
      },
    },
    paymentMode: {
      type: DataTypes.ENUM('Cash', 'Online', 'Bank Transfer', 'Cheque', 'Other'),
      allowNull: false,
      defaultValue: 'Cash',
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    isSettled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    salaryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: 'driver_advances',
    timestamps: true,
    indexes: [
      {
        fields: ['driverId'],
      },
      {
        fields: ['date'],
      },
      {
        fields: ['driverId', 'date'],
      },
    ],
  }
);

// Associations
Driver.hasMany(DriverAdvance, { foreignKey: 'driverId', as: 'advances' });
DriverAdvance.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });

export default DriverAdvance;
