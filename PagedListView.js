//@flow

import React, {
  PropTypes,
  Component
} from 'react';
import {
  RefreshControl,
} from 'react-native';
import ZKUtils from 'zhike-mobile-utils';
import ZKListView from './ZKListView';

export default class PagedListView extends Component {
  constructor(props) {
    super(props);
    this.state = { items:(props && props.initialItems) || [] };
    this._onScroll = this._onScroll.bind(this);
    this._onPullDown = this._onPullDown.bind(this);
    this._loadNextPage = this._loadNextPage.bind(this);
  }

  componentWillMount() {
    if (!this.props.initialItems || !this.props.initialItems.length) {
      this.setState({ refreshing:true });
      this._loadNextPage()
      .catch((err) => {
        console.warn('failed to call _loadNextPage, error: ', err);
      })
      .then(() => {
        this.setState({ refreshing:false });
      });
    }
  }

  onItemsMuted() {
    this.forceUpdate();
  }

  _onScroll(e) {
    this.props && this.props.onScroll && this.props.onScroll(e);
  }

  _onPullDown(e) {
    this.setState({ refreshing:true });
    this.props.fetchItems(0, this.props.pageSize * this._numberOfPages())
    .catch((err) => {
      console.error('failed to call fetchItems, error: ', err);
      ZKUtils.handleError(err);
      return null;
    })
    .then((res) => {
      const all = (res && res.items) || [];
      const update = { refreshing:false };
      if (all && all.length) {
        Object.assign(update, { items:all, totalPage:-1 });
      }
      this.setState(update);
    });
  }

  _loadNextPage() {
    return this.props.fetchItems(this._nextPage(), this.props.pageSize)// index starts from 1
    .then((res) => {
      this._appendPage(res);
    });
  }

  _noMorePage() {
    const ret = Object.prototype.hasOwnProperty.call(this.state, 'totalPage') && (this.state.totalPage > 0) && (this._numberOfPages() >= this.state.totalPage);
    return ret;
  }

  _nextPage() {
    return Math.floor(this.state.items.length / this.props.pageSize);
  }

  _numberOfPages() {
    return Math.floor((this.state.items.length + this.props.pageSize - 1) / this.props.pageSize);
  }

  _appendPage(pageOfItems) {
    if (!pageOfItems) return;

    const update = {};
    if (Object.prototype.hasOwnProperty.call(pageOfItems, 'totalPage')) {
      update.totalPage = pageOfItems.totalPage;
    }

    const existing = this.state.items;
    const butTails = existing.slice(0, this.props.pageSize * this._nextPage());
    let items = existing;
    const newOnes = pageOfItems.items;
    if (newOnes && newOnes.length) {
      items = butTails.concat(newOnes);
    }
    update.items = items;
    this.setState(update);
    console.log(
      'existing items, new items, resp: ',
      existing.map(item => item.id),
      newOnes.map(item => item.id),
      pageOfItems
    );
  }

  render() {
    let { initialItems, fetchItems, onScroll, ...other } = this.props;
    other = other || {};
    return (
      <ZKListView
        onScroll={this._onScroll}
        style={{ backgroundColor:'#f5f5f5' }}
        dataSource={this.props.genDataSource(this.state.items)}
        separatorStyle={{ backgroundColor: '#e6e6e6' }}
        refreshControl={
          <RefreshControl
            refreshing={!!this.state.refreshing}
            onRefresh={this._onPullDown}
            tintColor="#00B5E9"
            title="正在加载中..."
            progressBackgroundColor="#ffff00"
          />
        }
        hasMore={!this._noMorePage()}
        paging={true}
        onFetchNextPage={this._loadNextPage}
        {...other}
      />
    );
  }
}

PagedListView.propTypes = {
  ...ZKListView.propTypes,
  initialItems: PropTypes.arrayOf(PropTypes.object),
  fetchItems: PropTypes.func.isRequired,// (page, pageSize) => Promise<{items, totalPage}>
  pageSize: PropTypes.number,
  genDataSource: PropTypes.func.isRequired,
};

PagedListView.defaultProps = {
  pageSize: 10,
};
